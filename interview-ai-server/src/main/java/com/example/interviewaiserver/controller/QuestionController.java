package com.example.interviewaiserver.controller;

import com.example.interviewaiserver.dto.CustomQuestionRequestDto;
import com.example.interviewaiserver.dto.QuestionResponseDto;
import com.example.interviewaiserver.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    // 1) 공통 면접 질문 조회
    @GetMapping("/questions")
    public ResponseEntity<List<QuestionResponseDto>> getCommonQuestions(@RequestParam("type") String type) {
        if ("COMMON".equalsIgnoreCase(type)) {
            List<QuestionResponseDto> commonQuestions = questionService.findCommonQuestions().stream()
                    .map(QuestionResponseDto::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(commonQuestions);
        }
        return ResponseEntity.badRequest().build();
    }

    // 2-1) 자소서 기반 질문 생성
    @PostMapping("/resumes/{resumeId}/questions")
    public ResponseEntity<List<QuestionResponseDto>> createResumeQuestions(@PathVariable String resumeId) {
        List<QuestionResponseDto> generatedQuestions = questionService.generateResumeQuestions(resumeId).stream()
                .map(QuestionResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(generatedQuestions);
    }
    
    // 2-2) 자소서 기반 질문 조회
    @GetMapping("/resumes/{resumeId}/questions")
    public ResponseEntity<List<QuestionResponseDto>> getResumeQuestions(@PathVariable String resumeId) {
        List<QuestionResponseDto> resumeQuestions = questionService.findResumeQuestions(resumeId).stream()
                .map(QuestionResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(resumeQuestions);
    }

    // 3-1) 커스텀 질문 추가
    @PostMapping("/questions/custom")
    public ResponseEntity<Boolean> addCustomQuestion(@RequestBody CustomQuestionRequestDto requestDto) {
        questionService.createCustomQuestion(requestDto);
        return ResponseEntity.ok(true);
    }

    // 3-2) 커스텀 질문 삭제 (아래 @PathVariable 부분을 수정합니다)
    @DeleteMapping("/questions/{questionNO}")
    public ResponseEntity<Boolean> removeCustomQuestion(@PathVariable("questionNO") String questionNO) {
        try {
            questionService.deleteQuestion(questionNO);
            return ResponseEntity.ok(true);
        } catch (Exception e) {
            return ResponseEntity.ok(false);
        }
    }
}