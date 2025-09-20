// CalibrationRepository.java
package com.example.interviewaiserver.repository;

import com.example.interviewaiserver.domain.CalibrationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CalibrationRepository extends JpaRepository<CalibrationEntity, Long> {
    // Custom query methods can be defined here.
}