package com.example.interviewaiserver.repository;

import com.example.interviewaiserver.entity.InterviewSession;
import com.example.interviewaiserver.entity.Question;
import com.example.interviewaiserver.entity.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByQuestionType(QuestionType questionType);
    List<Question> findByResumeId(String resumeId);
    // 아래 메서드를 추가해야 합니다.
    Optional<Question> findByInterviewSessionAndQuestionType(InterviewSession interviewSession, QuestionType questionType);
}