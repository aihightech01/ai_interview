package com.example.interviewaiserver.domain;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "analysis")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 스펙을 위한 기본 생성자
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 빌더 패턴을 위한 전체 필드 생성자 (접근 제한)
@Builder // 빌더 패턴 적용
public class AnalysisEntity {


    // === PK이자 FK를 위한 핵심 어노테이션 설정 ===
    @Id // 1. 이 필드가 PK임을 선언합니다.
    @Column(name = "video_no") // 실제 DB 컬럼명을 지정합니다 (생략 가능).
    private Long videoNO; // PK를 위한 필드를 선언합니다.

    @OneToOne(fetch = FetchType.LAZY) // 2. 일대일 관계임을 선언합니다.
    @MapsId // 3. "id 필드에 user 필드의 ID 값을 매핑하라"는 지시입니다.
    @JoinColumn(name = "video_no") // 4. DB에 생성될 FK 컬럼을 지정합니다.
    private VideoEntity video;
    // ===========================================

    @Column(name = "vision", length = 5000)
    private String vision; // 날짜 정보 (시간이 필요하면 LocalDateTime 사용)

    @Column(name = "emotion", length = 5000)
    private String emotion; // 면접 제목

    @Column(name = "answer", length = 5000)
    private String answer; // 면접 종류
}