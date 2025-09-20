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
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    @GetMapping("/common")
    public ResponseEntity<List<QuestionResponseDto>> getCommonQuestions() {
        List<QuestionResponseDto> commonQuestions = questionService.findCommonQuestions().stream()
                .map(QuestionResponseDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(commonQuestions);
    }

    @PostMapping("/custom/{interviewId}")
    public ResponseEntity<Boolean> addCustomQuestion(
            @PathVariable Long interviewId,
            @RequestBody CustomQuestionRequestDto requestDto) {

        questionService.createCustomQuestion(interviewId, requestDto);
        return ResponseEntity.ok(true);
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<Boolean> removeCustomQuestion(@PathVariable Long questionId) {
        try {
            questionService.deleteQuestion(questionId);
            return ResponseEntity.ok(true);
        } catch (Exception e) {
            return ResponseEntity.ok(false);
        }
    }
}