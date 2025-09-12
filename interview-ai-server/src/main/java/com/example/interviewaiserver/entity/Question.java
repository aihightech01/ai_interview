package com.example.interviewaiserver.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
// @Table 어노테이션이 없으므로, ERD 합의안대로 'question' 테이블을 사용합니다.
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_id") // ERD의 questionNO(PK)에 해당
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") // ERD의 user id(FK)에 해당
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id") // ERD의 interviewNO(FK)에 해당
    private InterviewSession interviewSession;

    @Column(name = "resume_id") // 자소서 기반 질문일 경우, 원본 자소서 식별자
    private String resumeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false) // 질문 유형 (COMMON, RESUME, CUSTOM)
    private QuestionType questionType;

    @Column(nullable = false, length = 500) // ERD의 content에 해당
    private String content;

    @Builder
    public Question(User user, String resumeId, QuestionType questionType, String content, InterviewSession interviewSession) {
        this.user = user;
        this.resumeId = resumeId;
        this.questionType = questionType;
        this.content = content;
        this.interviewSession = interviewSession;
    }

    public void updateContent(String newContent) {
        this.content = newContent;
    }
}