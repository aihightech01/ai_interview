package com.example.interviewaiserver.service;

import com.example.interviewaiserver.domain.InterviewEntity;
import com.example.interviewaiserver.domain.QuestionEntity;
import com.example.interviewaiserver.domain.UserEntity;
import com.example.interviewaiserver.domain.VideoEntity;
import com.example.interviewaiserver.dto.CustomQuestionRequestDto;
import com.example.interviewaiserver.repository.InterviewRepository;
import com.example.interviewaiserver.repository.QuestionRepository;
import com.example.interviewaiserver.repository.UserRepository;
import com.example.interviewaiserver.repository.VideoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;
    private final VideoRepository videoRepository;

    public List<QuestionEntity> findCommonQuestions() {
        return questionRepository.findByQuestionType("COMMON");
    }

    @Transactional
    public QuestionEntity createCustomQuestion(Long interviewId, CustomQuestionRequestDto requestDto) {
        UserEntity user = userRepository.findById(requestDto.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        InterviewEntity interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new EntityNotFoundException("면접을 찾을 수 없습니다."));

        // 1. QuestionEntity 생성 및 저장
        QuestionEntity newQuestion = QuestionEntity.builder()
                .questionType("CUSTOM")
                .content(requestDto.getContent())
                .id(user)
                .build();
        QuestionEntity savedQuestion = questionRepository.save(newQuestion);

        // 2. Question과 Interview를 연결하는 더미 VideoEntity 생성 및 저장
        VideoEntity dummyVideo = VideoEntity.builder()
                .interviewNO(interview)
                .questionNO(savedQuestion)
                .videoDir("dummy/not_yet_recorded")
                .build();
        videoRepository.save(dummyVideo);

        return savedQuestion;
    }

    @Transactional
    public void deleteQuestion(Long questionId) {
        questionRepository.deleteById(questionId);
    }
}