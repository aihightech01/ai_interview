package com.example.interviewaiserver.service;

import com.example.interviewaiserver.domain.InterviewEntity;
import com.example.interviewaiserver.domain.QuestionEntity;
import com.example.interviewaiserver.domain.UserEntity;
import com.example.interviewaiserver.domain.VideoEntity;
import com.example.interviewaiserver.dto.PythonRequestDto;
import com.example.interviewaiserver.dto.PythonResponseDto;
import com.example.interviewaiserver.repository.InterviewRepository;
import com.example.interviewaiserver.repository.QuestionRepository;
import com.example.interviewaiserver.repository.UserRepository;
import com.example.interviewaiserver.repository.VideoRepository;
import com.example.interviewaiserver.util.FileParseUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.tika.exception.TikaException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
@Transactional
public class ResumeService {

    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;
    private final QuestionRepository questionRepository;
    private final VideoRepository videoRepository;
    private final RestTemplate restTemplate;

    public void saveResumeAndGenerateQuestions(Long interviewId, String userId, String interviewTitle, String textContent, MultipartFile file) throws IOException, TikaException {
        String fileText = FileParseUtil.parseFile(file);
        String combinedText = textContent + "\n\n--- 파일 내용 ---\n" + fileText;

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("ID가 " + userId + "인 사용자를 찾을 수 없습니다."));

        InterviewEntity interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new EntityNotFoundException("ID가 " + interviewId + "인 면접을 찾을 수 없습니다."));

        interview.setInterviewTitle(interviewTitle);

        generateAndSaveQuestionsFromPython(user, interview, combinedText);
    }

    private void generateAndSaveQuestionsFromPython(UserEntity user, InterviewEntity interview, String resumeText) {
        final String pythonApiUrl = "http://127.0.0.1:5001/generate-questions";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            PythonRequestDto requestDto = new PythonRequestDto(resumeText);
            HttpEntity<PythonRequestDto> requestEntity = new HttpEntity<>(requestDto, headers);

            PythonResponseDto response = restTemplate.postForObject(pythonApiUrl, requestEntity, PythonResponseDto.class);

            if (response != null && response.getQuestions() != null && !response.getQuestions().isEmpty()) {
                for (String q_content : response.getQuestions()) {
                    // 1. QuestionEntity 생성 및 저장
                    QuestionEntity newQuestion = QuestionEntity.builder()
                            .id(user)
                            .questionType("RESUME")
                            .content(q_content)
                            .build();
                    QuestionEntity savedQuestion = questionRepository.save(newQuestion);

                    // 2. Question과 Interview를 연결하는 더미 VideoEntity 생성 및 저장
                    VideoEntity dummyVideo = VideoEntity.builder()
                            .interviewNO(interview)
                            .questionNO(savedQuestion)
                            .videoDir("dummy/not_yet_recorded")
                            .build();
                    videoRepository.save(dummyVideo);
                }
                System.out.println("자소서 질문 " + response.getQuestions().size() + "개를 생성하고 면접에 연결했습니다.");
            }
        } catch (Exception e) {
            System.err.println("파이썬 서버 호출 또는 질문 처리 중 에러 발생: " + e.getMessage());
        }
    }
}