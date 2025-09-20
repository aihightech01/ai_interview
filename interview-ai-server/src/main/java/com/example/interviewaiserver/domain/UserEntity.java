package com.example.interviewaiserver.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 스펙을 위한 기본 생성자
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 빌더 패턴을 위한 전체 필드 생성자 (접근 제한)
@Builder // 빌더 패턴 적용
public class UserEntity {
    @Id
    @Column(name = "id", nullable = false, unique = true, length = 50)
    private String id; // PK, NOT NULL, 중복불가

    @Column(name = "pw", nullable = false, length = 128)
    private String pw; // NOT NULL

    @Column(name = "name", nullable = false, length = 50)
    private String name; // NOT NULL

    @Column(name = "email", nullable = false, length = 100)
    private String email; // NOT NULL
}
