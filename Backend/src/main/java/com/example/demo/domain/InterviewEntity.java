package com.example.demo.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "interviews")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 스펙을 위한 기본 생성자
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 빌더 패턴을 위한 전체 필드 생성자 (접근 제한)
@Builder // 빌더 패턴 적용
public class InterviewEntity {

    @Id // 이 필드가 Primary Key임을 나타냅니다.
    @GeneratedValue(strategy = GenerationType.IDENTITY) // PK 생성을 데이터베이스(MySQL의 AUTO_INCREMENT)에 위임합니다.
    @Column(name = "interview_no") // DB 컬럼명을 지정합니다. 자바의 camelCase와 DB의 snake_case를 매핑합니다.
    private Long interviewNO; // PK, 회차 번호

    // --- UserEntity(users 테이블)를 참조하는 외래 키(FK) 설정 ---
    @ManyToOne(fetch = FetchType.LAZY) // 다대일(N:1) 관계 설정. LAZY 로딩은 성능 최적화를 위해 필수입니다.
    @JoinColumn(name = "id")           // 'interviews' 테이블에 생성될 FK 컬럼의 이름을 'id'로 지정합니다.
    private UserEntity user;           // FK가 참조하는 UserEntity 객체를 필드로 가집니다.
    // JPA가 이 객체의 PK(@Id) 값을 'id' 컬럼에 자동으로 저장/조회해줍니다.
    // ----------------------------------------------------

    @Column(name = "interview_date")
    private LocalDateTime interviewDate; // 날짜 정보 (시간이 필요하면 LocalDateTime 사용)

    @Column(name = "interview_title")
    private String interviewTitle; // 면접 제목

    @Column(name = "interview_type")
    private int interviewType; // 면접 종류
    
    @Column(name = "interview_overall", columnDefinition = "TEXT")
    private String interviewOverall; // 면접 총평
    
    @PrePersist
    public void prePersist() {
        if (this.interviewDate == null) {
            this.interviewDate = LocalDateTime.now();
        }
    }
}