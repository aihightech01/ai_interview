package com.example.demo.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.domain.InterviewEntity;

@Repository
public interface InterviewRepository extends JpaRepository<InterviewEntity, Long> {
    
    List<InterviewEntity> findByUserId(String userId);

    // 가장 최근 인터뷰 1건 조회. 'userId'로 필터, interviewNo 제외, interviewDate 내림차순 정렬
    Optional<InterviewEntity> findTopByUser_IdAndInterviewNONotOrderByInterviewDateDesc(String userId, Long interviewNO);
}