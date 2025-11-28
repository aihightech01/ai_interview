package com.example.demo.service;

import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.QuestionEntity;
import com.example.demo.domain.UserEntity;
import com.example.demo.domain.VideoEntity;
import com.example.demo.dto.CustomQuestionRequestDto;
import com.example.demo.repository.InterviewRepository;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.VideoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;
    private final VideoRepository videoRepository;

    public List<QuestionEntity> findQuestionsForUser(String id) {
        List<QuestionEntity> commonQuestions = questionRepository.findByQuestionTypeIgnoreCase("common");
        List<QuestionEntity> userCustomQuestions = questionRepository.findUserCustomQuestions(id);
        List<QuestionEntity> result = new ArrayList<>();
        result.addAll(commonQuestions);
        result.addAll(userCustomQuestions);
        return result;
    }

    @Transactional
    public QuestionEntity createCustomQuestion(Long interviewNo, CustomQuestionRequestDto requestDto) {
        UserEntity user = userRepository.findById(requestDto.getId())
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));

        InterviewEntity interview = interviewRepository.findById(interviewNo)
                .orElseThrow(() -> new EntityNotFoundException("면접을 찾을 수 없습니다."));

        // 1. QuestionEntity 생성 및 저장
        QuestionEntity newQuestion = QuestionEntity.builder()
                .questionType("CUSTOM")
                .content(requestDto.getContent())
                .user(user)
                .build();
        QuestionEntity savedQuestion = questionRepository.save(newQuestion);

        // 2. Question과 Interview를 연결하는 더미 VideoEntity 생성 및 저장
        VideoEntity dummyVideo = VideoEntity.builder()
                .interview(interview)
                .question(savedQuestion)
                .videoDir("dummy/not_yet_recorded")
                .build();
        videoRepository.save(dummyVideo);

        return savedQuestion;
    }

    @Transactional
    public void deleteQuestion(Long questionNo) {
        questionRepository.deleteById(questionNo);
    }
}