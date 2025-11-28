package com.example.demo.service;

import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.UserEntity;
import com.example.demo.domain.VideoEntity;
import com.example.demo.dto.InterviewDto;
import com.example.demo.dto.InterviewsDto;
import com.example.demo.dto.VideoDto;
import com.example.demo.repository.InterviewRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.VideoRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InterviewService {

    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;

    public InterviewEntity createInterview(String id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("ID가 " + id + "인 사용자를 찾을 수 없습니다."));

        InterviewEntity newInterview = InterviewEntity.builder()
                .user(user)
                .interviewDate(LocalDateTime.now())
                .interviewTitle(user.getName() + "님의 모의 면접") // 기본 제목
                .interviewType(1) // '모의 면접'을 의미하는 1로 타입 고정
                .build();

        return interviewRepository.save(newInterview);
    }
    
    public List<InterviewDto> getInterviewsByUserId(String id) {
        return interviewRepository.findByUserId(id)
            .stream()
            .map(entity -> InterviewDto.builder()
                .interviewNo(entity.getInterviewNO())
                .interviewTitle(entity.getInterviewTitle())
                .interviewDate(entity.getInterviewDate())
                .interviewType(entity.getInterviewType())
                .interviewNo(entity.getInterviewNO())
                .interviewOverall(entity.getInterviewOverall())
                .build())
            .collect(Collectors.toList());
    }
    
    public List<VideoDto> getVideosByInterviewNo(Long interviewNo) {
        List<VideoEntity> videoEntities = videoRepository.findByInterview_InterviewNO(interviewNo);
        // VideoEntity를 VideoDto로 변환
        List<VideoDto> videoDtos = new ArrayList<>();
        for (VideoEntity entity : videoEntities) {
            VideoDto dto = new VideoDto();
            dto.setVideoNO(entity.getVideoNO());
            dto.setVideoDir(entity.getVideoDir());
            // 필요한 필드 추가 매핑
            videoDtos.add(dto);
        }
        return videoDtos;
    }
    
    public InterviewEntity save(InterviewEntity interview) {
        return interviewRepository.save(interview);
    }
    
    @Transactional(readOnly = true)
    public InterviewsDto findInterviewDtoById(Long interviewNo) {
        InterviewEntity interview = interviewRepository.findById(interviewNo)
            .orElseThrow(() -> new IllegalArgumentException("인터뷰를 찾을 수 없습니다. ID: " + interviewNo));

        String userId = interview.getUser() != null ? interview.getUser().getId() : null;

        return new InterviewsDto(
            interview.getInterviewNO(),
            interview.getInterviewDate(),
            interview.getInterviewOverall(),
            interview.getInterviewTitle(),
            String.valueOf(interview.getInterviewType()),
            userId
        );
    }
    
    private final VideoRepository videoRepository;

}