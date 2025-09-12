package com.example.interviewaiserver.service;

import com.example.interviewaiserver.dto.CustomQuestionRequestDto;
import com.example.interviewaiserver.entity.Question;
import com.example.interviewaiserver.entity.QuestionType;
import com.example.interviewaiserver.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestionService {

    private final QuestionRepository questionRepository;
    // private final ResumeRepository resumeRepository;
    // private final UserRepository userRepository;

    // 1) 공통 면접 질문 조회
    public List<Question> findCommonQuestions() {
        return questionRepository.findByQuestionType(QuestionType.COMMON);
    }

    // 2-1) 자소서 기반 질문 생성
    @Transactional
    public List<Question> generateResumeQuestions(String resumeId) {
        // TODO: resumeId로 자소서 조회
        // Resume resume = resumeRepository.findById(resumeId).orElseThrow(...);

        // TODO: LLM 또는 자체 분석 로직을 통해 자소서 텍스트에서 질문 생성
        List<String> generatedContents = Arrays.asList("프로젝트 X에서 맡은 역할과 성과는?", "가장 어려웠던 문제와 해결 과정은?"); // 예시 데이터

        List<Question> questions = generatedContents.stream()
                .map(content -> Question.builder()
                        .resumeId(resumeId)
                        .questionType(QuestionType.RESUME)
                        .content(content)
                        // .user(resume.getUser())
                        .build())
                .collect(Collectors.toList());

        return questionRepository.saveAll(questions);
    }

    // 2-2) 자소서 기반 질문 조회
    public List<Question> findResumeQuestions(String resumeId) {
        return questionRepository.findByResumeId(resumeId);
    }

    // 3-1) 커스텀 질문 추가
    @Transactional
    public Question createCustomQuestion(CustomQuestionRequestDto requestDto) {
        // TODO: 현재 로그인한 사용자 정보 가져오기
        // User currentUser = userRepository.findById(userId).orElseThrow(...);

        Question newQuestion = Question.builder()
                .questionType(QuestionType.CUSTOM)
                .content(requestDto.getContent())
                // .user(currentUser)
                .build();
        return questionRepository.save(newQuestion);
    }

    // 3-2) 커스텀 질문 삭제
    @Transactional
    public void deleteQuestion(String questionNO) {
        Long actualId = parseIdFromQuestionNO(questionNO);
        // TODO: 삭제 권한 확인 (본인이 작성한 질문인지)
        questionRepository.deleteById(actualId);
    }

    private Long parseIdFromQuestionNO(String questionNO) {
        try {
            String idPart = questionNO.substring(questionNO.lastIndexOf('_') + 1);
            return Long.parseLong(idPart);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid questionNO format: " + questionNO);
        }
    }
}