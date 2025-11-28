package com.example.demo.controller;

import com.example.demo.domain.CalibrationEntity;
import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.QuestionEntity;
import com.example.demo.domain.VideoEntity;
import com.example.demo.dto.AnalysisDto;
import com.example.demo.dto.CalibrationDto;
import com.example.demo.dto.InterviewDto;
import com.example.demo.dto.InterviewWithVideosDto;
import com.example.demo.dto.InterviewsDto;
import com.example.demo.dto.UserDto;
import com.example.demo.dto.UserProfileResponseDto;
import com.example.demo.dto.VideoDto;
import com.example.demo.dto.VideoInfoDto;
import com.example.demo.repository.CalibrationsRepository;
import com.example.demo.repository.VideoRepository;
import com.example.demo.service.AnalysisService;
import com.example.demo.service.InterviewService;
import com.example.demo.service.UserService;
import com.example.demo.service.VideoProcessingService;
import com.example.demo.util.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/user")
public class UserController {
	
	private final VideoProcessingService videoProcessingService;
	
	private final CalibrationsRepository calibrationsRepository;
	
	private final VideoRepository videoRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;
    
    @Autowired
    private InterviewService interviewService;
    
    @Autowired
    private AnalysisService analysisService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Boolean>> register(@RequestBody UserDto user) {
        boolean result = userService.registerUser(user);
        Map<String, Boolean> response = new HashMap<>();
        response.put("message", result);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserDto user) {
        boolean valid = userService.loginUser(user.getId(), user.getPw());
        if (valid) {
            String token = jwtUtil.generateToken(user.getId());
            UserDto userInfo = userService.findUserById(user.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);

            Map<String, String> userMap = new HashMap<>();
            userMap.put("id", userInfo.getId());
            userMap.put("name", userInfo.getName());

            response.put("user", userMap);

            return ResponseEntity.ok().body(response);
        } else {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "아이디 또는 비밀번호가 올바르지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of(
            "message", true
        ));
    }

    @GetMapping("/check-id")
    public ResponseEntity<Map<String, Boolean>> checkUserId(@RequestParam("id") String id) {
        boolean exists = userService.existsById(id);
        Map<String, Boolean> response = new HashMap<>();
        response.put("exists", exists);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getMyPage(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("토큰을 제공하지 않았습니다.");
        }
        String token = authHeader.replace("Bearer ", "");
        String userId;
        try {
            userId = jwtUtil.extractUserId(token);
        } catch (io.jsonwebtoken.ExpiredJwtException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("토큰 유효기간이 만료되었습니다.");
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("잘못된 토큰입니다.");
        }

        UserDto user = userService.getUserById(userId);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("사용자를 찾을 수 없습니다.");
        }

        // 인터뷰 리스트 조회 및 최신순 정렬
        List<InterviewDto> interviews = interviewService.getInterviewsByUserId(userId);
        interviews.sort((a, b) -> b.getInterviewDate().compareTo(a.getInterviewDate())); // 최신순 정렬

        List<Map<String, Object>> interviewList = new ArrayList<>();
        Object lastOverallCompare = "이전 인터뷰 총평이 없습니다.";

        for (InterviewDto interview : interviews) {
            Map<String, Object> item = new HashMap<>();
            item.put("interview_title", interview.getInterviewTitle());
            item.put("interview_date", interview.getInterviewDate());
            item.put("interview_no", interview.getInterviewNo());
            int interviewType = interview.getInterviewType();
            item.put("interview_type", interviewType == 1 ? "모의 면접" : "실전 면접");
            item.put("interview_overall", interview.getInterviewOverall());

            // 해당 인터뷰의 연결된 영상 개수
            List<VideoDto> videos = interviewService.getVideosByInterviewNo(interview.getInterviewNo());
            item.put("question_count", videos.size());

            // 분석 완료 여부
            boolean allAnalyzed = true;
            for (VideoDto v : videos) {
                AnalysisDto analysis = analysisService.getAnalysisByVideoNo(v.getVideoNO());
                if (analysis == null 
                    || analysis.getAnswer() == null
                    || analysis.getEmotion() == null
                    || analysis.getVision() == null) {
                    allAnalyzed = false;
                    break;
                }
            }
            item.put("analysis_status", allAnalyzed ? "분석 완료" : "현재 분석 중");
            interviewList.add(item);
        }

        // 최신 인터뷰의 overallcompare 추출
        if (!interviews.isEmpty()) {
            InterviewDto latestInterview = interviews.get(0);
            String interviewOverall = latestInterview.getInterviewOverall();
            System.out.println(interviewOverall);
            if (interviewOverall != null && !interviewOverall.isEmpty()) {
                try {
                    ObjectMapper objectMapper = new ObjectMapper();
                    JsonNode obj = objectMapper.readTree(interviewOverall);
                    if (obj.has("overallcompare")) {
                        lastOverallCompare = obj.get("overallcompare").asText();
                    } else {
                        lastOverallCompare = "이전 인터뷰 총평이 없습니다.";
                    }
                } catch (Exception e) {
                    lastOverallCompare = "이전 인터뷰 총평이 없습니다.";
                }
            } else {
                lastOverallCompare = "이전 인터뷰 총평이 없습니다.";
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("interviews", interviewList);
        response.put("overallcompare", lastOverallCompare);

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/profile/{interviewNo}")
    public ResponseEntity<Map<String, Object>> getInterviewWithVideos(@PathVariable("interviewNo") Long interviewNo) {
        InterviewsDto interviewsDto = interviewService.findInterviewDtoById(interviewNo);
        List<VideoInfoDto> videos = videoProcessingService.findVideosByInterviewNo(interviewNo);

        Map<String, Object> result = new HashMap<>();
        result.put("interview", interviewsDto);
        result.put("videos", videos);

        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/update")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "토큰을 제공하지 않았습니다."));
        }
        String token = authHeader.replace("Bearer ", "");
        String userId;
        try {
            userId = jwtUtil.extractUserId(token);
        } catch (io.jsonwebtoken.ExpiredJwtException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "토큰 유효기간이 만료되었습니다."));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "잘못된 토큰입니다."));
        }

        UserDto user = userService.getUserById(userId);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "사용자를 찾을 수 없습니다."));
        }
        return ResponseEntity.ok(Map.of(
            "name", user.getName(),
            "email", user.getEmail()
        ));
    }
    
    @Transactional
    @GetMapping("/profile/{interviewNo}/{videoNo}")
    public ResponseEntity<UserProfileResponseDto> getVideoAnalysis(
            @PathVariable("interviewNo") Long interviewNo,
            @PathVariable("videoNo") Long videoNo) {

        VideoEntity video = videoRepository.findById(videoNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));

        if (!video.getInterview().getInterviewNO().equals(interviewNo)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        QuestionEntity question = video.getQuestion();

        AnalysisDto analysis = analysisService.getAnalysisByVideoNo(videoNo);

        CalibrationEntity calibration = calibrationsRepository.findByInterview_InterviewNO(interviewNo)
                                           .orElse(null);

        CalibrationDto calibrationDto = (calibration != null) ? CalibrationDto.fromEntity(calibration) : null;

        String videoStreamingUrl = "/videos/stream/" + videoNo;

        UserProfileResponseDto responseDto = UserProfileResponseDto.builder()
                .videoNo(video.getVideoNO())
                .thumbnailDir(video.getThumbnailDir())
                .videoDir(video.getVideoDir())
                .questionNo(question != null ? question.getQuestionNO() : null)
                .questionContent(question != null ? question.getContent() : null)
                .analysis(analysis)
                .calibration(calibrationDto)
                .videoStreamUrl(videoStreamingUrl)
                .build();

        return ResponseEntity.ok(responseDto);
    }


    @PostMapping("/update")
    public ResponseEntity<?> updateProfile(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody Map<String, String> body
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "토큰을 제공하지 않았습니다."));
        }
        String token = authHeader.replace("Bearer ", "");
        String userId;
        try {
            userId = jwtUtil.extractUserId(token);
        } catch (io.jsonwebtoken.ExpiredJwtException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "토큰 유효기간이 만료되었습니다."));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "잘못된 토큰입니다."));
        }

        String pw = body.get("pw");
        String newPw = body.get("newPw");
        String name = body.get("name");
        String email = body.get("email");

        int result = userService.updateProfile(userId, pw, newPw, name, email);

        if (result == -1) {
            return ResponseEntity.ok(Map.of("message", "기존 비밀번호가 일치하지 않습니다."));
        } else {
            return ResponseEntity.ok(Map.of("message", result == 1));
        }
    }
}
