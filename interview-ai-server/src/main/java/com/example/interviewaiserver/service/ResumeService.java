package com.example.interviewaiserver.service;

import com.example.interviewaiserver.dto.PythonRequestDto;
import com.example.interviewaiserver.dto.PythonResponseDto;
import com.example.interviewaiserver.entity.InterviewSession;
import com.example.interviewaiserver.entity.Question;
import com.example.interviewaiserver.entity.QuestionType;
import com.example.interviewaiserver.entity.User;
import com.example.interviewaiserver.repository.InterviewSessionRepository;
import com.example.interviewaiserver.repository.QuestionRepository;
import com.example.interviewaiserver.repository.UserRepository;
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
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ResumeService {

    private final UserRepository userRepository;
    private final InterviewSessionRepository sessionRepository;
    private final QuestionRepository questionRepository;
    private final RestTemplate restTemplate;

    // 컨트롤러가 호출할 수 있도록 public 메서드를 정의합니다.
    public void saveResumeWithTextAndFile(String userId, String textContent, MultipartFile file) throws IOException, TikaException {
        String fileText = FileParseUtil.parseFile(file);
        String combinedText = textContent + "\n\n--- 파일 내용 ---\n" + fileText;
        processAndSave(userId, combinedText);
    }
    
    private void processAndSave(String userId, String fullResumeText) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("ID가 " + userId + "인 사용자를 찾을 수 없습니다."));

        InterviewSession session = sessionRepository.findFirstByUserOrderByIdDesc(user)
                .orElseGet(() -> {
                    InterviewSession newSession = new InterviewSession(user);
                    return sessionRepository.save(newSession);
                });

        generateAndSaveQuestionsFromPython(user, session, fullResumeText);
    }

    private void generateAndSaveQuestionsFromPython(User user, InterviewSession session, String resumeText) {
        // ... (이하 코드는 이전과 동일) ...
    }
}