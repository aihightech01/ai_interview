package com.example.demo.service;

import com.example.demo.domain.CalibrationEntity;
import com.example.demo.domain.InterviewEntity;
import com.example.demo.dto.CalibrationResultDto;
import com.example.demo.repository.CalibrationRepository;
import com.example.demo.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class CalibrationService {

    // --- 의존성 주입 ---
    private final CalibrationRepository calibrationRepository;
    private final InterviewRepository interviewRepository;
    private final RestTemplate restTemplate;
    private final VideoConversionService videoConversionService; // 파일 변환 서비스

    // --- 설정값 주입 ---
    @Value("${fastapi.server.url}")
    private String fastapiUrl;

    /**
     * 동영상 파일을 받아 MP4로 변환하고, FastAPI 서버로 보내 캘리브레이션을 수행한 후,
     * 그 결과를 데이터베이스에 저장하는 전체 비즈니스 로직을 처리합니다.
     * @param videoFile 컨트롤러로부터 받은 원본 동영상 파일
     * @param interviewNo 결과와 연결될 면접 회차 ID
     * @throws IOException 파일 처리 또는 API 통신 중 오류 발생 시
     * @throws IllegalArgumentException interviewNo에 해당하는 면접이 없을 경우
     */
    @Transactional
    public void calibrateAndSave(MultipartFile videoFile, Long interviewNo) throws IOException {
        // 서버에 생성된 임시 파일은 작업이 끝나면 반드시 삭제해야 합니다.
        File convertedMp4File = null;
        try {
            // 1. [변환] VideoConversionService를 사용해 원본 파일을 MP4로 변환합니다.
            // 이 과정에서 서버에 임시 MP4 파일이 생성됩니다.
            convertedMp4File = videoConversionService.convertToMp4(videoFile);

            // 2. [외부 API 호출] 변환된 MP4 파일을 FastAPI 서버로 전송하고 분석 결과를 받습니다.
            CalibrationResultDto resultDto = callFastApiForCalibration(convertedMp4File);


            // 3. [DB 조회] 결과를 저장하기 위해, 연결할 InterviewEntity를 DB에서 조회합니다.
            //    만약 ID에 해당하는 면접이 없으면 여기서 IllegalArgumentException이 발생하고,
            //    컨트롤러가 이를 받아서 404 Not Found 응답을 보냅니다.
            InterviewEntity interview = interviewRepository.findById(interviewNo)
                    .orElseThrow(() -> new IllegalArgumentException("요청한 면접 회차를 찾을 수 없습니다. ID: " + interviewNo));

            // 4. [엔티티 생성] 조회한 InterviewEntity와 FastAPI 결과값을 합쳐 CalibrationEntity를 생성합니다.
            CalibrationEntity calibrationEntity = CalibrationEntity.builder()
                    .interview(interview) // 객체지향적으로 필드명은 'interview'를 권장합니다.
                    .gazeYaw(resultDto.getGazeYaw())
                    .gazePitch(resultDto.getGazePitch())
                    .headYaw(resultDto.getHeadYaw())
                    .headPitch(resultDto.getHeadPitch())
                    .build();

            // 5. [DB 저장] 완성된 엔티티를 데이터베이스에 저장합니다.
            calibrationRepository.save(calibrationEntity);

        } finally {
            // 6. [정리] try 블록의 모든 작업이 성공적으로 끝나거나, 혹은 중간에 예외가 발생하더라도
            //    이 finally 블록은 항상 실행됩니다. 서버에 불필요한 파일이 남지 않도록 임시 파일을 삭제합니다.
            if (convertedMp4File != null && convertedMp4File.exists()) {
                convertedMp4File.delete();
            }
        }
    }

    /**
     * 변환된 MP4 파일을 FastAPI 서버로 전송하는 로직을 담당합니다.
     * @param videoFile 변환이 완료된 MP4 파일 객체
     * @return FastAPI 서버로부터 받은 캘리브레이션 분석 결과 DTO
     */
    private CalibrationResultDto callFastApiForCalibration(File videoFile) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        // File 객체를 보낼 때는 FileSystemResource로 감싸주는 것이 효율적입니다.
        body.add("video_file", new FileSystemResource(videoFile));

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        String serverUrl = fastapiUrl + "/calibrate";

        return restTemplate.postForObject(serverUrl, requestEntity, CalibrationResultDto.class);
    }
}