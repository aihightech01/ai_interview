package com.example.demo.repository;

import com.example.demo.domain.QuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuestionRepository extends JpaRepository<QuestionEntity, Long> {

    // 공통 질문 모두 조회 (question_type = 'common')
    List<QuestionEntity> findByQuestionTypeIgnoreCase(String questionType);

    // 특정 사용자 id에 대해 question_type이 'RESUME' 또는 'CUSTOM'인 질문 조회
    @Query("SELECT q FROM QuestionEntity q WHERE q.user.id = :id AND (LOWER(q.questionType) = 'resume' OR LOWER(q.questionType) = 'custom')")
    List<QuestionEntity> findUserCustomQuestions(@Param("id") String id);

}
