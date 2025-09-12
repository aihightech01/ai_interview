package com.example.interviewaiserver.dto;

import com.example.interviewaiserver.entity.Question;
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

    // Entity -> DTO 변환 메서드
    public static QuestionResponseDto fromEntity(Question question) {
        String questionPrefix = "";
        switch (question.getQuestionType()) {
            case COMMON:
                questionPrefix = "q_c_";
                break;
            case RESUME:
                questionPrefix = "q_r_";
                break;
            case CUSTOM:
                questionPrefix = "q_u_"; // User custom
                break;
        }

        return QuestionResponseDto.builder()
                .questionNO("q_" + question.getId()) // 접두사 로직은 예시로 단순화
                .interviewNO(question.getInterviewSession() != null ? question.getInterviewSession().getId() : null)
                .userID(question.getUser() != null ? question.getUser().getId() : null) // 이제 String을 반환하므로 타입 일치
                .questionType(question.getQuestionType().name())
                .questionContent(question.getContent())
                .build();
    }
}