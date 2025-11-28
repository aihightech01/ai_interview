package com.example.demo.service;

import jakarta.annotation.PostConstruct;
import com.example.demo.domain.AnalysisEntity;
import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.QuestionEntity;
import com.example.demo.domain.UserEntity;
import com.example.demo.domain.VideoEntity;
import com.example.demo.dto.InterviewWithVideosDto;
import com.example.demo.dto.VideoInfoDto;
import com.example.demo.repository.AnalysisRepository;
import com.example.demo.repository.InterviewRepository;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.VideoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.Frame;
import org.bytedeco.javacv.Java2DFrameConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VideoProcessingService {

    private final AnalysisService analysisService;

    private final VideoRepository videoRepository;
    // --- 3단계 구현 (추가된 부분) ---
    // 연관관계를 맺기 위해 부모 엔티티의 레포지토리가 필요합니다.
    private final InterviewRepository interviewRepository;
    private final QuestionRepository questionRepository;
    // --- 5단계 구현 (추가된 부분) ---
    private final AnalysisRepository analysisRepository;
    // -----------------------------
    private final VideoConversionService videoConversionService;
    private final RestTemplate restTemplate;

    // --- 설정값 주입 ---
    
    @Value("${fastapi.server.url}")
    private String fastapiUrl;

    // 1. application.properties에서 파일 저장 경로를 주입받습니다.
    @Value("${file.storage.path}")
    private String storagePath;

    private Path storageDirectory;

    // 2. 서버가 시작될 때, 파일 저장 경로가 실제로 존재하는지 확인하고 없으면 생성합니다.
    @PostConstruct
    public void init() {
        this.storageDirectory = Paths.get(storagePath);
        try {
            Files.createDirectories(this.storageDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Could not create storage directory: " + storagePath, e);
        }
    }

    @Transactional
    public void processAndAnalyzeVideo(Long interviewNo, Long questionNo, MultipartFile videoFile) throws IOException {

        // 1~5 단계 (기존 코드 유지)
        File savedMp4File = saveVideoAsMp4(videoFile);

        try {
            File thumbnailFile = extractThumbnail(savedMp4File);
            int totalFrames = getTotalFrames(savedMp4File);

            InterviewEntity interview = interviewRepository.findById(interviewNo)
                    .orElseThrow(() -> new IllegalArgumentException("요청한 면접 회차를 찾을 수 없습니다. ID: " + interviewNo));

            QuestionEntity question = questionRepository.findById(questionNo)
                    .orElseThrow(() -> new IllegalArgumentException("요청한 질문을 찾을 수 없습니다. ID: " + questionNo));

            VideoEntity videoEntity = VideoEntity.builder()
                    .interview(interview)
                    .question(question)
                    .videoDir(savedMp4File.getPath())
                    .thumbnailDir(thumbnailFile.getPath())
                    .frames(totalFrames)
                    .build();

            VideoEntity savedVideoEntity = videoRepository.save(videoEntity);
            videoRepository.flush();

            // 6. mp3 추출
            System.out.println("3. mp3 추출");
            String mp3Path = extractMp3FromVideo(savedVideoEntity.getVideoDir());
            System.out.println(mp3Path);

            // 7. STT API 호출
            System.out.println("4. STT API 호출하여 답변 내용 생성");
            JsonNode answer = callSttApi(mp3Path);
            System.out.println(answer);

            // 8. 분석 서비스 호출 (여러 API 호출 및 결과 저장)
            System.out.println("5. 분석 서비스 호출 (여러 API 호출 및 결과 저장)");
            analysisService.analyzeAll(savedVideoEntity.getVideoNO(), savedVideoEntity.getVideoDir(), question.getContent(), answer, interviewNo);
            
            // 해당 인터뷰에 속한 모든 영상 조회 및 개수 확인
            List<VideoEntity> videosForInterview = videoRepository.findAllWithAnalysisByInterviewNo(interviewNo);

            if (videosForInterview.size() >= 3) {
                System.out.println("3개 이상이라 총평 호출");
                ObjectMapper mapper = new ObjectMapper();
                List<Map<String, Object>> extractedDataList = new ArrayList<>();

                for (VideoEntity video : videosForInterview) {
                    AnalysisEntity analysis = video.getAnalysis();
                    if (analysis != null && analysis.getAnswer() != null) {
                        JsonNode answerNode = mapper.readTree(analysis.getAnswer());
                        JsonNode emotionNode = mapper.readTree(analysis.getEmotion());
                        JsonNode visionNode = mapper.readTree(analysis.getVision());

                        Map<String, Object> item = new HashMap<>();
                        item.put("overall", answerNode.path("overall").asText());
                        item.put("score", answerNode.path("score").asDouble());
                        item.put("emotion_avg", emotionNode.path("average_score").asDouble());
                        item.put("vision_avg", visionNode.path("average_score").asDouble());
                        extractedDataList.add(item);
                    }
                }

                String jsonInput = mapper.writeValueAsString(extractedDataList);
                String llmResult = analysisService.callLlmAggregateApi(jsonInput, interviewNo);

                InterviewEntity interviews = interviewRepository.findById(interviewNo)
                    .orElseThrow(() -> new IllegalArgumentException("인터뷰를 찾을 수 없습니다. ID: " + interviewNo));

                // 이전 인터뷰 중 가장 최근 1건 조회 (userId, interviewNo 제외)
                UserEntity user = interviews.getUser();
                if (user == null) {
                    throw new IllegalArgumentException("해당 인터뷰에 연결된 사용자가 없습니다.");
                }
                String userId = user.getId(); // UserEntity의 ID가 String 타입일 경우

                Optional<InterviewEntity> recentInterviewOpt = interviewRepository.findTopByUser_IdAndInterviewNONotOrderByInterviewDateDesc(userId, interviewNo);



                double prevEmotionAvg = 0.0;
                double prevVisionAvg = 0.0;
                double prevScoreAvg = 0.0;

                if (recentInterviewOpt.isPresent()) {
                    InterviewEntity recentInterview = recentInterviewOpt.get();
                    List<VideoEntity> prevVideos = videoRepository.findAllWithAnalysisByInterviewNo(recentInterview.getInterviewNO());

                    prevEmotionAvg = prevVideos.stream()
                        .map(VideoEntity::getAnalysis)
                        .filter(a -> a != null && a.getEmotion() != null)
                        .mapToDouble(a -> {
                            try {
                                return mapper.readTree(a.getEmotion()).path("average_score").asDouble();
                            } catch (Exception e) {
                                return 0;
                            }
                        }).average().orElse(0);

                    prevVisionAvg = prevVideos.stream()
                        .map(VideoEntity::getAnalysis)
                        .filter(a -> a != null && a.getVision() != null)
                        .mapToDouble(a -> {
                            try {
                                return mapper.readTree(a.getVision()).path("average_score").asDouble();
                            } catch (Exception e) {
                                return 0;
                            }
                        }).average().orElse(0);

                    prevScoreAvg = prevVideos.stream()
                        .map(VideoEntity::getAnalysis)
                        .filter(a -> a != null && a.getAnswer() != null)
                        .mapToDouble(a -> {
                            try {
                                return mapper.readTree(a.getAnswer()).path("score").asDouble();
                            } catch (Exception e) {
                                return 0;
                            }
                        }).average().orElse(0);
                }

                double currEmotionAvg = extractedDataList.stream()
                    .mapToDouble(m -> (double) m.get("emotion_avg"))
                    .average().orElse(0);

                double currVisionAvg = extractedDataList.stream()
                    .mapToDouble(m -> (double) m.get("vision_avg"))
                    .average().orElse(0);

                double currScoreAvg = extractedDataList.stream()
                    .mapToDouble(m -> (double) m.get("score"))
                    .average().orElse(0);

                Map<String, Object> comparePayload = new HashMap<>();
                comparePayload.put("previous_interview", Map.of(
                    "emotion_avg", prevEmotionAvg,
                    "vision_avg", prevVisionAvg,
                    "score_avg", prevScoreAvg
                ));
                comparePayload.put("current_interview", Map.of(
                    "emotion_avg", currEmotionAvg,
                    "vision_avg", currVisionAvg,
                    "score_avg", currScoreAvg
                ));

                String compareJson = mapper.writeValueAsString(comparePayload);

                String compareResult = analysisService.callLlmCompareApi(compareJson, interviewNo);

                Map<String, Object> combinedResult = new HashMap<>();

                if (recentInterviewOpt.isPresent()) {
                    // 이전 인터뷰가 있을 경우 (비교 결과 포함)
                    combinedResult.put("overallcompare", llmResult);
                    combinedResult.put("comparison", compareResult);
                } else {
                    // 이전 인터뷰가 없을 경우 (종합분석만 저장)
                    combinedResult.put("overallcompare", llmResult);
                }

                String combinedJsonString = mapper.writeValueAsString(combinedResult);

                interviews.setInterviewOverall(combinedJsonString);
                interviewRepository.save(interviews);
            }


        } catch (Exception e) {
            if (!savedMp4File.delete()) {
                System.out.println("Warning: 임시 파일 삭제에 실패했습니다: " + savedMp4File.getPath());
            }
            throw new IOException("영상 처리 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * MultipartFile을 받아 MP4로 변환하고, 설정된 영구 저장 경로에 저장합니다.
     * @param multipartFile 클라이언트로부터 받은 원본 동영상 파일
     * @return 서버에 최종적으로 저장된 MP4 파일 객체
     * @throws IOException 파일 변환 또는 저장 중 오류 발생 시
     */
    private File saveVideoAsMp4(MultipartFile multipartFile) throws IOException {
        // 1. VideoConversionService를 사용하여 MP4로 변환합니다.
        //    이 서비스는 내부에 임시 파일을 생성하고 변환 후 삭제하는 로직을 포함합니다.
        File tempConvertedMp4 = videoConversionService.convertToMp4(multipartFile);

        // 2. 저장할 파일의 고유한 이름을 생성합니다. (UUID 사용)
        String uniqueFileName = UUID.randomUUID() + ".mp4";

        // 3. 최종 저장 경로를 설정합니다. (예: C:/ai_interview/storage/a1b2c3d4.mp4)
        Path destinationPath = this.storageDirectory.resolve(uniqueFileName);

        try {
            // 4. 변환된 임시 파일을 최종 목적지로 이동(move)시킵니다.
            Files.move(tempConvertedMp4.toPath(), destinationPath);
        } finally {
            // 5. 만약 이동 중 오류가 발생해도 임시 파일이 남지 않도록 한번 더 삭제를 시도합니다.
            if (tempConvertedMp4.exists()) {
                if (!tempConvertedMp4.delete()) {
                    // log.warn("임시 파일 삭제에 실패했습니다: {}", savedMp4File.getPath());
                    System.out.println("Warning: 임시 파일 삭제에 실패했습니다: " + tempConvertedMp4.getPath());
                }
            }
        }

        // 최종적으로 저장된 파일의 File 객체를 반환합니다.
        return destinationPath.toFile();
    }


    /**
     * 동영상 파일에서 특정 프레임(예: 1초 지점)을 추출하여 썸네일 이미지 파일로 저장합니다.
     * @param videoFile 썸네일을 추출할 원본 동영상 파일 (MP4)
     * @return 서버에 저장된 썸네일 파일 객체
     * @throws IOException 프레임 추출 또는 이미지 저장 중 오류 발생 시
     */
    private File extractThumbnail(File videoFile) throws IOException {
        String thumbnailFileName = videoFile.getName().replace(".mp4", ".png");
        Path thumbnailPath = this.storageDirectory.resolve(thumbnailFileName);

        // --- 수정된 부분: 두 개의 리소스를 한 번에 관리 ---
        try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(videoFile);
             Java2DFrameConverter converter = new Java2DFrameConverter()) {

            grabber.start();

            grabber.setTimestamp(1_000_000); // 1초
            Frame frame = grabber.grabImage();

            if (frame == null) {
                throw new IOException("썸네일을 위한 프레임을 잡을 수 없습니다.");
            }

            BufferedImage bufferedImage = converter.convert(frame);

            if (bufferedImage == null) {
                throw new IOException("프레임을 이미지로 변환할 수 없습니다.");
            }

            ImageIO.write(bufferedImage, "png", thumbnailPath.toFile());

            // grabber.stop()은 try-with-resources가 자동으로 처리하므로 명시적으로 호출할 필요가 없습니다.
            // (FFmpegFrameGrabber는 AutoCloseable을 구현하며, close()가 내부적으로 stop()을 호출합니다)

        } catch (Exception e) {
            throw new IOException("썸네일 추출 중 오류가 발생했습니다: " + videoFile.getName(), e);
        }

        return thumbnailPath.toFile();
    }

    /**
     * 동영상 파일의 총 프레임 수를 반환합니다.
     * @param videoFile 총 프레임 수를 확인할 동영상 파일
     * @return 총 프레임 수 (int)
     * @throws IOException 파일 분석 중 오류 발생 시
     */
    private int getTotalFrames(File videoFile) throws IOException {
        try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(videoFile)) {
            grabber.start();
            int totalFrames = grabber.getLengthInFrames();
            grabber.stop();
            return totalFrames;
        } catch (Exception e) {
            throw new IOException("총 프레임 수 추출 중 오류가 발생했습니다: " + videoFile.getName(), e);
        }
    }

    /**
     * 저장된 영상 파일을 FastAPI 서버로 전송하여 시계열 분석을 요청하고,
     * 결과를 JSON 문자열 형태로 받습니다.
     * @param videoFile 로컬에 저장된 분석 대상 MP4 파일
     * @return FastAPI 서버로부터 받은 프레임별 분석 결과 (JSON 배열 형태의 문자열)
     */
    private String callFastApiForAnalysis(File videoFile) {
        // 1. HTTP 헤더 설정 (multipart/form-data)
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        // 2. HTTP 바디 구성
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("video_file", new FileSystemResource(videoFile));

        // 3. 헤더와 바디를 합쳐 요청 엔티티 생성
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        // 4. FastAPI 분석 엔드포인트 URL 설정
        String serverUrl = fastapiUrl + "/analyze_video";

        // 5. RestTemplate으로 POST 요청 전송 및 응답 수신
        //    이번에는 응답을 DTO가 아닌 String.class로 받습니다.
        //    이유: 응답이 단일 객체가 아닌 JSON 배열이므로, 문자열로 통째로 받는 것이 더 간단하고 유연합니다.
        String result = restTemplate.postForObject(serverUrl, requestEntity, String.class);

        if (result == null || result.isEmpty()) {
            throw new RuntimeException("FastAPI 서버로부터 분석 결과를 받지 못했습니다.");
        }

        return result;
    }
    
    public String extractMp3FromVideo(String videoPath) throws IOException, InterruptedException {
        String mp3FileName = UUID.randomUUID() + ".mp3";
        Path mp3Path = Paths.get(storagePath, mp3FileName);
        
        System.out.println("[extractMp3FromVideo] mp3 추출 시작: " + videoPath);
        
        String[] command = {
            "ffmpeg", "-i", videoPath,
            "-q:a", "0",
            "-map", "a",
            "-y", mp3Path.toString()
        };
        
        Process process = new ProcessBuilder(command)
            .redirectErrorStream(true)
            .start();
        
        try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[ffmpeg] " + line);
            }
        }
        
        int exitCode = process.waitFor();
        System.out.println("[extractMp3FromVideo] FFmpeg 종료 코드: " + exitCode);
        if (exitCode != 0) {
            throw new RuntimeException("mp3 추출 실패, 종료 코드: " + exitCode);
        }
        
        System.out.println("[extractMp3FromVideo] mp3 추출 완료: " + mp3Path.toString());
        return mp3Path.toString();
    }
    
 // STT API 호출
    private JsonNode callSttApi(String mp3FilePath) {
        String sttApiUrl = "http://172.31.57.139:5002/stt"; // Whisper Flask 서버 주소 및 포트

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // JSON 바디에 파일 경로 전달
        String jsonBody = "{\"file_path\":\"" + mp3FilePath.replace("\\", "\\\\") + "\"}";

        HttpEntity<String> requestEntity = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(sttApiUrl, requestEntity, String.class);

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.getBody());
            return root;
            //return root.path("text").asText("");
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
    
    @Transactional
    public InterviewWithVideosDto findInterviewWithVideosByInterviewNo(Long interviewNo) {
        InterviewEntity interview = interviewRepository.findById(interviewNo)
            .orElseThrow(() -> new IllegalArgumentException("인터뷰를 찾을 수 없습니다. ID: " + interviewNo));

        List<VideoEntity> videos = videoRepository.findByInterview_InterviewNO(interviewNo);

        List<VideoInfoDto> videoDtos = videos.stream().map(video -> {
            QuestionEntity question = video.getQuestion();
            return new VideoInfoDto(
                video.getVideoNO(),
                video.getThumbnailDir(),
                question != null ? question.getQuestionNO() : null,
                question != null ? question.getContent() : null,
                video.getVideoDir()
            );
        }).collect(Collectors.toList());

        return new InterviewWithVideosDto(interview, videoDtos);
    }
    
    @Transactional(readOnly = true)
    public List<VideoInfoDto> findVideosByInterviewNo(Long interviewNo) {
        List<VideoEntity> videos = videoRepository.findByInterview_InterviewNO(interviewNo);

        return videos.stream().map(video -> {
            QuestionEntity question = video.getQuestion();
            return new VideoInfoDto(
                video.getVideoNO(),
                video.getThumbnailDir(),
                question != null ? question.getQuestionNO() : null,
                question != null ? question.getContent() : null,
                video.getVideoDir()
            );
        }).collect(Collectors.toList());
    }
}