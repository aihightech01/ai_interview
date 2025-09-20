package com.example.interviewaiserver.domain; // 패키지명은 현재 프로젝트에 맞게 확인해주세요.

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class QuestionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_no")
    private Long quesionNO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") // DB 컬럼명은 실제 DB에 맞게 확인해주세요.
    private UserEntity id;

    @Column(name = "question_type", nullable = false, length = 50)
    private String questionType;

    @Column(name = "content", nullable = false, length = 500)
    private String content;

}