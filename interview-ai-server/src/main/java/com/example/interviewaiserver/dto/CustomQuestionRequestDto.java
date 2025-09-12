package com.example.interviewaiserver.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CustomQuestionRequestDto {
    private String content; // 사용자가 입력한 질문 내용
}