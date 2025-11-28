package com.example.demo.controller;

import com.example.demo.domain.QuestionEntity;
import com.example.demo.domain.UserEntity;
import com.example.demo.dto.QuestionResponseDto;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.QuestionService;
import com.example.demo.util.JwtUtil;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionRepository questionRepository;

    private final QuestionService questionService;
    
    private final JwtUtil jwtUtil;
    
    @Autowired
    private UserRepository userRepository;

    @GetMapping("/my-questions")
    public ResponseEntity<List<QuestionResponseDto>> getMyQuestions(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        String token = authHeader.replace("Bearer ", "");
        String id;
        try {
            id = jwtUtil.extractUserId(token);  // jwtUtil은 필드로 주입되어 있어야 함
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<QuestionEntity> questions = questionService.findQuestionsForUser(id);
        List<QuestionResponseDto> response = questions.stream()
                .map(QuestionResponseDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/custom")
    public ResponseEntity<?> createCustomQuestion(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        Map<String, Object> result = new HashMap<>();

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            result.put("success", false);
            result.put("error", "토큰이 없거나 형식이 올바르지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
        }

        String token = authHeader.replace("Bearer ", "");
        String userId;
        try {
            userId = jwtUtil.extractUserId(token);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "토큰이 유효하지 않습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
        }

        // userId로 UserEntity 조회
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자가 존재하지 않습니다."));

        String content = request.get("content");
        if (content == null || content.trim().isEmpty()) {
            result.put("success", false);
            result.put("error", "질문 내용이 비어 있습니다.");
            return ResponseEntity.badRequest().body(result);
        }

        QuestionEntity question = QuestionEntity.builder()
                .content(content)
                .questionType(request.getOrDefault("questionType", "CUSTOM"))
                .user(user)
                .build();

        questionRepository.save(question);

        result.put("success", true);
        result.put("question_no", question.getQuestionNO());
        return ResponseEntity.ok(result);
    }


    // 자소서 질문 삭제
    @DeleteMapping("/delete/{questionNo}")
    public ResponseEntity<Map<String, Object>> deleteResumeQuestion(@PathVariable("questionNo") Long questionNo) {
        if (!questionRepository.existsById(questionNo)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", false, "error", "자소서 질문을 찾을 수 없습니다."));
        }

        questionRepository.deleteById(questionNo);
        return ResponseEntity.ok(Map.of("success", true));
    }
}