package com.example.demo.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class InterviewsDto {
    private Long interviewNo;
    private LocalDateTime interviewDate;
    private String interviewOverall;
    private String interviewTitle;
    private String interviewType;
    private String userId;  // UserEntity의 식별자

    public InterviewsDto(Long interviewNo, LocalDateTime interviewDate, String interviewOverall, String interviewTitle, String interviewType, String userId) {
        this.interviewNo = interviewNo;
        this.interviewDate = interviewDate;
        this.interviewOverall = interviewOverall;
        this.interviewTitle = interviewTitle;
        this.interviewType = interviewType;
        this.userId = userId;
    }

}