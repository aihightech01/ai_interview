package com.example.demo.domain;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "videos")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class VideoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "video_no")
    private Long videoNO;

    // --- InterviewEntity(interviews 테이블)를 참조하는 FK ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_no", nullable = false)
    private InterviewEntity interview;

    // --- QuestionEntity(questions 테이블)을 참조하는 FK ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_no", nullable = false)
    private QuestionEntity question;

    @Column(name = "video_dir", nullable = false)
    private String videoDir;

    @Column(name = "thumbnail_dir")
    private String thumbnailDir;

    @Column(name = "frames")
    private int frames;
    
    @OneToOne(mappedBy = "video", fetch = FetchType.LAZY)
    private AnalysisEntity analysis;

    // 필요에 따라 toString, equals, hashCode 등을 추가 가능합니다 (롬복 활용 가능)
}
