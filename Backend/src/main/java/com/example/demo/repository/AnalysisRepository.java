package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

import com.example.demo.domain.AnalysisEntity;

@Repository
public interface AnalysisRepository extends JpaRepository<AnalysisEntity, Long> {
    // Custom query methods can be defined here.
	Optional<AnalysisEntity> findByVideoNO(Long videoNO);
}