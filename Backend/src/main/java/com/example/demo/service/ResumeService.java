package com.example.demo.service;

import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.QuestionEntity;
import com.example.demo.domain.UserEntity;
import com.example.demo.repository.InterviewRepository;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.FileParseUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.tika.exception.TikaException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ResumeService {

    private final UserRepository userRepository;
    private final InterviewRepository interviewRepository;
    private final QuestionRepository questionRepository;
    private final RestTemplate restTemplate;

    public void saveResumeAndGenerateQuestions(Long interviewNo, String interviewTitle, String textContent, MultipartFile file, String userId) throws IOException, TikaException {
    	String content = null;
    	try {
    	    content = FileParseUtil.parseFile(file);
    	    // content 처리
    	} catch (Exception e) {
    	    e.printStackTrace();
    	    // 예외 처리 로직
    	}
        String combinedText = textContent + "\n\n--- 파일 내용 ---\n" + content;
        
        System.out.println(combinedText);

        InterviewEntity interview = interviewRepository.findById(interviewNo)
                .orElseThrow(() -> new EntityNotFoundException("ID가 " + interviewNo + "인 면접을 찾을 수 없습니다."));

        interview.setInterviewTitle(interviewTitle);

        generateAndSaveQuestionsFromPython(interview, combinedText, userId);
    }

    private ResponseEntity<?> generateAndSaveQuestionsFromPython(InterviewEntity interview, String resumeText, String userId) {
        final String pythonApiUrl = "http://localhost:5000/generate-questions";
        int successCount = 0;
        int failCount = 0;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            var requestDto = new com.example.demo.dto.PythonRequestDto(resumeText);
            var requestEntity = new HttpEntity<>(requestDto, headers);

            var response = restTemplate.postForObject(pythonApiUrl, requestEntity, com.example.demo.dto.PythonResponseDto.class);

            if (response != null && response.getQuestions() != null && !response.getQuestions().isEmpty()) {
                // UserEntity 조회
                UserEntity user = userRepository.findById(userId)
                        .orElseThrow(() -> new EntityNotFoundException("사용자 ID가 없습니다."));

                for (String q_content : response.getQuestions()) {
                    try {
                        QuestionEntity newQuestion = QuestionEntity.builder()
                                .questionType("RESUME")
                                .content(q_content)
                                .user(user)  // UserEntity 객체 저장
                                .build();
                        questionRepository.save(newQuestion);
                        successCount++;
                    } catch (Exception e) {
                        failCount++;
                    }
                }
                System.out.println("자소서 질문 " + response.getQuestions().size() + "개 중 " +
                        successCount + "개 성공, " + failCount + "개 실패");
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "질문 생성 결과 없음"));
            }
        } catch (Exception e) {
            System.err.println("파이썬 서버 호출 또는 질문 처리 중 에러 발생: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of("message", "질문 생성 또는 저장 중 서버 오류 발생")
            );
        }
        Map<String, Object> result = new HashMap<>();
        result.put("success", successCount);
        result.put("fail", failCount);
        result.put("total", successCount + failCount);
        result.put("result", (failCount == 0));
        return ResponseEntity.ok(result);
    }
}
