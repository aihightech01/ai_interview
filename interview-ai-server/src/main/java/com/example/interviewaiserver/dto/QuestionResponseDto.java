package com.example.interviewaiserver.dto;

import com.example.interviewaiserver.domain.QuestionEntity;
import lombok.Builder;
import lombok.Getter;

@Getter
public class QuestionResponseDto {
    private final String questionNO;
    private final Long interviewNO;
    private final String userID;
    private final String questionType;
    private final String questionContent;

    @Builder
    public QuestionResponseDto(String questionNO, Long interviewNO, String userID, String questionType, String questionContent) {
        this.questionNO = questionNO;
        this.interviewNO = interviewNO;
        this.userID = userID;
        this.questionType = questionType;
        this.questionContent = questionContent;
    }

    public static QuestionResponseDto fromEntity(QuestionEntity question) {
        return QuestionResponseDto.builder()
                .questionNO("q_" + question.getQuesionNO())
                .interviewNO(question.getInterview() != null ? question.getInterview().getInterviewNO() : null)
                .userID(question.getId() != null ? question.getId().getId() : null)
                .questionType(question.getQuestionType())
                .questionContent(question.getContent())
                .build();
    }
}