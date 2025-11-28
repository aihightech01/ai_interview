package com.example.demo.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class InterviewDto {
    private Long interviewNo;       // 인터뷰 고유번호
    private String interviewTitle;  // 인터뷰 제목
    private LocalDateTime interviewDate;  // 인터뷰 일자 및 시간
    private int interviewType;      // 면접 종류 (1=모의면접, 2=실전면접)
    private String interviewOverall;
    
}