package com.example.interviewaiserver.controller;

import com.example.interviewaiserver.domain.InterviewEntity;
import com.example.interviewaiserver.dto.InterviewStartRequestDto;
import com.example.interviewaiserver.dto.InterviewStartResponseDto;
import com.example.interviewaiserver.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interviews")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @PostMapping("/start")
    public ResponseEntity<InterviewStartResponseDto> startInterview(@RequestBody InterviewStartRequestDto requestDto) {
        // 서비스를 호출하여 새로운 면접을 생성하고, 생성된 InterviewEntity를 받습니다.
        InterviewEntity newInterview = interviewService.createInterview(requestDto.getUserId());

        // 응답 DTO에 생성된 면접의 ID를 담아 반환합니다.
        InterviewStartResponseDto responseDto = new InterviewStartResponseDto(newInterview.getInterviewNO());

        return ResponseEntity.ok(responseDto);
    }
}