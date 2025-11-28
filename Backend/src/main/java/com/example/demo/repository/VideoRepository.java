package com.example.demo.repository;

import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.QuestionEntity;
import com.example.demo.domain.VideoEntity;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoRepository extends JpaRepository<VideoEntity, Long> {

	@Query("SELECT v FROM VideoEntity v JOIN FETCH v.interview i JOIN FETCH v.question q " +
		       "WHERE i = :interview AND q = :question")
		VideoEntity findByInterviewAndQuestion(@Param("interview") InterviewEntity interview,
		                                       @Param("question") QuestionEntity question);
	
	List<VideoEntity> findByInterview_InterviewNO(Long interviewNO);
	
	@Query("SELECT v FROM VideoEntity v JOIN FETCH v.question WHERE v.interview.interviewNO = :interviewNo")
	List<VideoEntity> findByInterviewNoWithQuestion(@Param("interviewNo") Long interviewNo);
	
	@Query("SELECT v FROM VideoEntity v " +
	           "JOIN FETCH v.analysis a " +
	           "WHERE v.interview.interviewNO = :interviewNo")
	    List<VideoEntity> findAllWithAnalysisByInterviewNo(@Param("interviewNo") Long interviewNo);

}