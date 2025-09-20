package com.example.interviewaiserver.repository;

import com.example.interviewaiserver.entity.InterviewSession;
import com.example.interviewaiserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {
    // 아래 메서드를 추가해야 합니다.
    Optional<InterviewSession> findFirstByUserOrderByIdDesc(User user);
}