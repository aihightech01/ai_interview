package com.example.demo.service;

import com.example.demo.domain.AnalysisEntity;
import com.example.demo.domain.CalibrationEntity;
import com.example.demo.domain.VideoEntity;
import com.example.demo.dto.AnalysisDto;
import com.example.demo.repository.AnalysisRepository;
import com.example.demo.repository.CalibrationRepository;
import com.example.demo.repository.VideoRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnalysisService {

    private final AnalysisRepository analysisRepository;
    private final VideoRepository videoRepository;
    private final CalibrationRepository calibrationRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager; // 추가

    public AnalysisService(AnalysisRepository analysisRepository, VideoRepository videoRepository, CalibrationRepository calibrationRepository) {
        this.analysisRepository = analysisRepository;
        this.videoRepository = videoRepository;
        this.calibrationRepository = calibrationRepository;        
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @Async
    @Transactional
    public void analyzeAll(Long videoNo, String videoPath, String question, JsonNode answer, long interviewNo) {
        try {
            System.out.println("[AnalysisService] 감정 분석 API 호출 시작: videoPath=" + videoPath);
            Object emotionResponse = callEmotionApi(videoPath);
            System.out.println("[AnalysisService] 감정 분석 API 응답: " + objectToJsonSafe(emotionResponse));
            
            String text = answer.path("text").asText("");
            String timeline = answer.get("timeline").toString();
            System.out.println(timeline);
            System.out.println("[AnalysisService] LLM 분석 API 호출 시작: question=" + question + ", answer=" + text);
            Object llmResponse = callLLMApi(question, text, timeline);
            System.out.println("[AnalysisService] LLM 분석 API 응답: " + objectToJsonSafe(llmResponse));
            
            CalibrationEntity calibration = calibrationRepository.findByInterview_InterviewNO(interviewNo)
                    .orElseThrow(() -> new IllegalArgumentException("캘리브레이션 정보가 없습니다. interviewNo: " + interviewNo));
            
            System.out.println("[AnalysisService] 시선 분석 API 호출 시작");
            String visionData = analyzeVideoSeries(videoPath, calibration.getGazePitch(), calibration.getGazeYaw(), calibration.getHeadPitch(), calibration.getHeadYaw());
            System.out.println("[AnalysisService] 시선 분석 API 응답, 답변 저장 시작");
            
            
         // overall API 호출
            Object overallResponse = callOverallApi(timeline, objectToJsonSafe(emotionResponse), visionData);
            System.out.println("[AnalysisService] Overall API 응답: " + objectToJsonSafe(overallResponse));

            // llmResponse + overall 병합
            JsonNode overallNode = objectMapper.readTree(objectToJsonSafe(overallResponse));
            JsonNode overallValueNode = overallNode.get("overall");  // 중첩된 답변 값만 추출

            JsonNode llmNode = objectMapper.readTree(objectToJsonSafe(llmResponse));
            ObjectNode combinedAnswerNode = (ObjectNode) llmNode;
            combinedAnswerNode.set("overall", overallValueNode);   // 중복 없이 값만 추가

            String combinedAnswerJson = combinedAnswerNode.toString();

            VideoEntity videoEntity = videoRepository.findById(videoNo)
                    .orElseThrow(() -> new IllegalArgumentException("VideoEntity not found with videoNo: " + videoNo));

            VideoEntity managedVideoEntity = entityManager.merge(videoEntity);

            AnalysisEntity analysisEntity = AnalysisEntity.builder()
                    .video(managedVideoEntity)
                    .vision(visionData)
                    .emotion(objectToJsonSafe(emotionResponse))
                    .answer(combinedAnswerJson)  // overall 데이터를 포함한 answer 저장
                    .build();

            analysisRepository.save(analysisEntity);
            System.out.println("[AnalysisService] AnalysisEntity 저장 완료 videoNo=" + videoNo);

        } catch (Exception e) {
            System.err.println("[AnalysisService] API 호출 또는 저장 중 예외 발생:");
            e.printStackTrace();
        }
    }

    private String objectToJsonSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return "{}";
        }
    }

    private Object callEmotionApi(String videoPath) {
        String url = "http://localhost:5001/analyze_video";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> requestBody = Map.of("video_path", videoPath);

        HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

        return restTemplate.postForObject(url, request, Object.class);
    }

    private Object callLLMApi(String question, String answer, String timeline) {
        String url = "http://localhost:5000/interview_analyze";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> requestBody = Map.of(
                "question", question,
                "answer", answer,
                "timeline", timeline
        );

        HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

        return restTemplate.postForObject(url, request, Object.class);
    }
    
    public AnalysisDto getAnalysisByVideoNo(Long videoNo) {
        return analysisRepository.findByVideoNO(videoNo)
            .<AnalysisDto>map((AnalysisEntity entity) -> AnalysisDto.builder()
                .videoNO(entity.getVideo().getVideoNO()) // VideoEntity 내 getVideoNo() 존재 확인 필수
                .answer(entity.getAnswer())
                .emotion(entity.getEmotion())
                .vision(entity.getVision())
                .build())
            .orElse(null);
    }
    
    public String analyzeVideoSeries(String videoFilePath,  double gazePitch, double gazeYaw, double headPitch, double headYaw) {
        String url = "http://localhost:5003/analyze_video";  // FastAPI 서버 URL

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("video_file", new FileSystemResource(videoFilePath));
        body.add("calib_gp", String.valueOf(gazePitch));
        body.add("calib_gy", String.valueOf(gazeYaw));
        body.add("calib_hp", String.valueOf(headPitch));
        body.add("calib_hy", String.valueOf(headYaw));

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody();  // JSON 배열 문자열 리턴
        } else {
            throw new RuntimeException("영상 분석 요청 실패, 상태 코드: " + response.getStatusCode());
        }
    }
    
    private Object callOverallApi(String timeline, String emotion, String vision) {
        String url = "http://localhost:5000/overall";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 요청 바디 구성: JSON 필드 이름과 값 지정
        Map<String, String> requestBody = Map.of(
            "timeline", timeline,
            "emotion", emotion,
            "vision", vision
        );

        HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

        return restTemplate.postForObject(url, request, Object.class);
    }
    
    /**
     * 여러 영상의 분석 answer들을 받아서 종합 분석을 수행하고 결과 저장
     * @param answers 영상별 분석 결과 answer 리스트
     * @param interviewNo 인터뷰 번호
     */
    @Transactional
    public String aggregateAnalysis(List<String> answers, Long interviewNo) {
        try {
            // ObjectMapper는 멤버 필드이므로 그대로 사용
            List<String> overallList = answers.stream()
                .map(answerJson -> {
                    try {
                        JsonNode node = objectMapper.readTree(answerJson);
                        JsonNode overallNode = node.get("overall");
                        // 만약 전체 객체면 toString(), 단순 텍스트면 asText()
                        return overallNode != null ? overallNode.toString() : null;
                    } catch (Exception e) {
                        e.printStackTrace();
                        return null;
                    }
                })
                .filter(overall -> overall != null)
                .collect(Collectors.toList());

            // aggregate API에 actually overallList만 넘김
            ObjectNode requestNode = objectMapper.createObjectNode();
            requestNode.putPOJO("overalls", overallList); // overalls로 명명, API 요구에 따라 수정
            requestNode.put("interviewNo", interviewNo);

            String aggregateApiUrl = "http://172.31.57.137:5000/aggregate_analysis";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> request = new HttpEntity<>(objectMapper.writeValueAsString(requestNode), headers);

            String aggregateResponse = restTemplate.postForObject(aggregateApiUrl, request, String.class);

            System.out.println("[AnalysisService] 종합 분석 API 응답: " + aggregateResponse);

            return aggregateResponse;

        } catch (Exception e) {
            System.err.println("[AnalysisService] 종합 분석 API 호출 중 예외 발생:");
            e.printStackTrace();
            return null;
        }
    }
    
    public String callLlmAggregateApi(String jsonInput, Long interviewNo) throws JsonMappingException, JsonProcessingException {
        String url = "http://localhost:5000/overoverall";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // jsonInput이 이미 JSON string이므로, String으로 바로 보내면 됨
        HttpEntity<String> request = new HttpEntity<>(jsonInput, headers);

        // 결과는 String(분석 요약 결과 등)
        String response = restTemplate.postForObject(url, request, String.class);
        if (response == null || response.isEmpty()) {
            throw new RuntimeException("LLM API에서 결과를 받지 못했습니다.");
        }
        ObjectMapper mapper = new ObjectMapper();
        String overallOnly = mapper.readTree(response).path("overall").asText();

        return overallOnly;
    }

    public String callLlmCompareApi(String compareJson, Long interviewNo) {
        String url = "http://localhost:5000/overall_compare";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<String> request = new HttpEntity<>(compareJson, headers);

        String response = restTemplate.postForObject(url, request, String.class);
        if (response == null || response.isEmpty()) {
            throw new RuntimeException("LLM 비교 분석 API에서 결과를 받지 못했습니다.");
        }
        
        ObjectMapper mapper = new ObjectMapper();
        try {
            return mapper.readTree(response).path("overall_compare").asText();
        } catch (Exception e) {
            throw new RuntimeException("응답 파싱 실패: " + e.getMessage());
        }
    }
}
