package com.example.demo.dto;

import com.example.demo.domain.QuestionEntity;
import lombok.Builder;
import lombok.Getter;

@Getter
public class QuestionResponseDto {
    private final Long questionNO;
    private final String questionType;
    private final String questionContent;

    @Builder
    public QuestionResponseDto(Long questionNO, String questionType, String questionContent) {
        this.questionNO = questionNO;
        this.questionType = questionType;
        this.questionContent = questionContent;
    }

    public static QuestionResponseDto fromEntity(QuestionEntity question) {
        return QuestionResponseDto.builder()
                .questionNO(question.getQuestionNO())  // 숫자 값 그대로 사용
                .questionType(question.getQuestionType())
                .questionContent(question.getContent())
                .build();
    }
}