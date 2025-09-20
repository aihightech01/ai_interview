package com.example.interviewaiserver.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "calibrations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 스펙을 위한 기본 생성자
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 빌더 패턴을 위한 전체 필드 생성자 (접근 제한)
@Builder // 빌더 패턴 적용
public class CalibrationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cali_no")
    private Long caliNO; // PK, 캘리브레이션 번호

    // --- InterviewEntity(interviews 테이블)를 참조하는 FK (일대일 관계) ---
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_no", nullable = false, unique = true) // FK 컬럼명 지정 및 NOT NULL, UNIQUE 제약조건 추가
    private InterviewEntity interviewNO;

    @Column(name = "gaze_yaw", nullable = false)
    private Double gazeYaw; // 시선 Yaw

    @Column(name = "gaze_pitch", nullable = false)
    private Double gazePitch; // 시선 Pitch

    @Column(name = "head_yaw", nullable = false)
    private Double headYaw; // 머리 Yaw

    @Column(name = "head_pitch", nullable = false)
    private Double headPitch; // 머리 Pitch
}