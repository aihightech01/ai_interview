package com.example.interviewaiserver.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "interviews")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class InterviewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "interview_no")
    private Long interviewNO;

    @ManyToOne(fetch = FetchType.LAZY)
    // 💡 실제 DB의 외래 키 컬럼명으로 수정해야 합니다.
    @JoinColumn(name = "user_id") // <-- 'id'에서 실제 DB 컬럼명인 'user_id'로 수정
    private UserEntity id;

    @Column(name = "interview_date")
    private LocalDateTime interviewDate;

    @Column(name = "interview_title")
    private String interviewTitle;

    @Column(name = "interview_type")
    private int interviewType;
}