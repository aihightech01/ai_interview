package com.example.interviewaiserver.dto;

import lombok.Getter;

@Getter
public class InterviewStartResponseDto {
    private final Long interviewId;

    public InterviewStartResponseDto(Long interviewId) {
        this.interviewId = interviewId;
    }
}