package com.example.interviewaiserver.repository;

import com.example.interviewaiserver.domain.AnalysisEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalysisRepository extends JpaRepository<AnalysisEntity, Long> {
}