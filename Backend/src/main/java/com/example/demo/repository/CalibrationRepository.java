package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import org.springframework.stereotype.Repository;

import com.example.demo.domain.CalibrationEntity;

@Repository
public interface CalibrationRepository extends JpaRepository<CalibrationEntity, Long> {
	Optional<CalibrationEntity> findByInterview_InterviewNO(Long interviewNo);
}