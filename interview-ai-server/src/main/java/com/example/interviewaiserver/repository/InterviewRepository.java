// InterviewRepository.java
package com.example.interviewaiserver.repository;

import com.example.interviewaiserver.domain.InterviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InterviewRepository extends JpaRepository<InterviewEntity, Long> {
    // Custom query methods can be defined here.
    // Example: List<InterviewEntity> findById_IdOrderByInterviewDateDesc(String userId);
}