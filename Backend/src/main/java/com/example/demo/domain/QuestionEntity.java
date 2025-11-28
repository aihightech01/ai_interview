package com.example.demo.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 스펙을 위한 기본 생성자
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 빌더 패턴을 위한 전체 필드 생성자 (접근 제한)
@Builder // 빌더 패턴 적용
public class QuestionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "question_no")
    private Long questionNO; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id") // DB 컬럼명
    private UserEntity user;

    @Column(name = "question_type", nullable = false, length = 50)
    private String questionType; // Enum 타입을 직접 사용하는 것이 더 좋습니다.

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

}