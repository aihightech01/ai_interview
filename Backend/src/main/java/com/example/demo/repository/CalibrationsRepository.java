package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.domain.CalibrationEntity;

import java.util.Optional;

@Repository
public interface CalibrationsRepository extends JpaRepository<CalibrationEntity, Long> {

    // 인터뷰 번호로 단일 켈리브레이션 조회 (Optional 반환)
	Optional<CalibrationEntity> findByInterview_InterviewNO(Long interviewNo);

}