package com.example.interviewaiserver.service;

import com.example.interviewaiserver.domain.InterviewEntity;
import com.example.interviewaiserver.domain.UserEntity;
import com.example.interviewaiserver.repository.InterviewRepository;
import com.example.interviewaiserver.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class InterviewService {

    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;

    public InterviewEntity createInterview(String userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("ID가 " + userId + "인 사용자를 찾을 수 없습니다."));

        InterviewEntity newInterview = InterviewEntity.builder()
                .id(user)
                .interviewDate(LocalDateTime.now())
                .interviewTitle(user.getName() + "님의 모의 면접") // 기본 제목
                .interviewType(1) // '모의 면접'을 의미하는 1로 타입 고정
                .build();

        return interviewRepository.save(newInterview);
    }
}