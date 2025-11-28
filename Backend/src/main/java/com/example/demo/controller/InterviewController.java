package com.example.demo.controller;

import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.UserEntity;
import com.example.demo.service.CalibrationService;
import com.example.demo.service.InterviewService;
import com.example.demo.service.UserService;
import com.example.demo.service.VideoProcessingService;
import com.example.demo.util.JwtUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import lombok.RequiredArgsConstructor;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;
    private final CalibrationService calibrationService;
    private final VideoProcessingService videoProcessingService;
    private final JwtUtil jwtUtil;
    
    @Autowired
    private UserService userService;

    // DTO 클래스 정의
    public static class InterviewCreateRequest {
        private int interviewType;
        private String title;

        // getters, setters
        public int getInterviewType() { return interviewType; }
        public void setInterviewType(int interviewType) { this.interviewType = interviewType; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
    }

    public static class InterviewCreateResponse {
        private Long interviewNo;
        public InterviewCreateResponse(Long interviewNo) { this.interviewNo = interviewNo; }
        public Long getInterviewNo() { return interviewNo; }
    }

    @PostMapping("/start")
    public ResponseEntity<?> startInterview(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody InterviewCreateRequest request) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return new ResponseEntity<>("Authorization header missing or invalid", HttpStatus.UNAUTHORIZED);
        }

        String token = authHeader.substring(7);
        String id;
        try {
            id = jwtUtil.extractUserId(token);
        } catch (Exception e) {
            return new ResponseEntity<>("Invalid or expired token", HttpStatus.UNAUTHORIZED);
        }

        int type = request.getInterviewType();
        if (type != 1 && type != 2) {
            return new ResponseEntity<>("Invalid interviewType, should be 1 or 2", HttpStatus.BAD_REQUEST);
        }

        // InterviewEntity 생성
        UserEntity userEntity = userService.findUserEntityById(id); // id는 JWT에서 추출한 사용자 id (String)
        InterviewEntity interview = InterviewEntity.builder()
            .user(userEntity)
            .interviewType(type)
            .build();
        InterviewEntity saved = interviewService.save(interview);
        return ResponseEntity.ok(new InterviewCreateResponse(saved.getInterviewNO()));
    }
    
    /**
     * 특정 면접 회차에 대한 캘리브레이션을 시작합니다.
     * 클라이언트로부터 동영상 파일을 받아 서비스 계층에 전달합니다.
     * @param interviewNo 캘리브레이션을 진행할 면접 회차의 ID (URL 경로에서 추출)
     * @param videoFile 클라이언트가 업로드한 동영상 파일 (webm, mp4 등)
     * @return 작업 성공 또는 실패에 대한 HTTP 응답
     */
    // 2. "ID가 {interviewNo}인 interview에 대해 calibration을 수행한다"는 의미의 URL로 변경
    @PostMapping("/{interviewNo}/calibration")
    public ResponseEntity<Map<String, Object>> calibrate(
            @PathVariable("interviewNo") Long interviewNo, 
            @RequestParam("video") MultipartFile videoFile) {

        Map<String, Object> response = new HashMap<>();

        if (videoFile.isEmpty()) {
            response.put("message", false);
            response.put("error", "업로드된 비디오 파일이 비어있습니다.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            calibrationService.calibrateAndSave(videoFile, interviewNo); // 서비스 호출
            response.put("message", true); // 성공
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("message", false);
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (IOException e) {
            response.put("message", false);
            response.put("error", "파일 처리 중 서버 내부 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            response.put("message", false);
            response.put("error", "알 수 없는 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }


    /**
     * 특정 면접의 특정 질문에 대한 답변 영상을 업로드하고 분석을 요청합니다.
     * @param interviewNo 면접 회차의 ID
     * @param questionNo 질문의 ID
     * @param videoFile 사용자가 업로드한 답변 영상 파일
     * @return 작업 성공 또는 실패에 대한 HTTP 응답
     */
    @PostMapping("/{interviewNo}/{questionNo}/video")
    public ResponseEntity<Map<String, Object>> uploadAndAnalyzeVideo(
        @PathVariable("interviewNo") Long interviewNo,
        @PathVariable("questionNo") Long questionNo,
        @RequestParam("video") MultipartFile videoFile) {

        Map<String, Object> response = new HashMap<>();

        if (videoFile.isEmpty()) {
            response.put("success", false);
            response.put("error", "업로드된 비디오 파일이 비어있습니다.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            videoProcessingService.processAndAnalyzeVideo(interviewNo, questionNo, videoFile);
            response.put("message", true);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("message", false);
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (IOException e) {
            response.put("message", false);
            response.put("error", "영상 처리 중 서버 내부 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            response.put("message", false);
            response.put("error", "알 수 없는 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}