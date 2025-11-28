package com.example.demo.dto;

import lombok.Getter;

@Getter
public class InterviewStartResponseDto {
    private final Long interviewNO;

    public InterviewStartResponseDto(Long interviewNO) {
        this.interviewNO = interviewNO;
    }
}