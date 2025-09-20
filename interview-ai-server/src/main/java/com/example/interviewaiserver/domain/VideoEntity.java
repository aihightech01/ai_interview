package com.example.interviewaiserver.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "videos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 스펙을 위한 기본 생성자
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 빌더 패턴을 위한 전체 필드 생성자 (접근 제한)
@Builder // 빌더 패턴 적용
public class VideoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "video_no")
    private Long videoNO;

    // --- InterviewEntity(interviews 테이블)를 참조하는 FK ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_no", nullable = false)
    private InterviewEntity interviewNO;

    // --- Question(questions 테이블)을 참조하는 FK ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_no", nullable = false) // Question 엔티티의 PK 컬럼명인 'question_id'를 참조
    private QuestionEntity questionNO;

    @Column(name = "video_dir", nullable = false)
    private String videoDir;

    @Column(name = "thumbnail_dir")
    private String thumbnailDir;

    @Column(name = "frames")
    private int frames;
}