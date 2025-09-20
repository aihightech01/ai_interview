package com.example.interviewaiserver.controller;

import com.example.interviewaiserver.dto.ResumeUploadRequestDto;
import com.example.interviewaiserver.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.apache.tika.exception.TikaException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;

    @PostMapping("/upload/{interviewId}")
    public ResponseEntity<String> uploadResume(
            @PathVariable Long interviewId,
            @ModelAttribute ResumeUploadRequestDto requestDto) throws TikaException, IOException {

        resumeService.saveResumeAndGenerateQuestions(
                interviewId,
                requestDto.getUserId(),
                requestDto.getInterviewTitle(), // 서비스에 interviewTitle 전달
                requestDto.getTextContent(),
                requestDto.getResumeFile()
        );
        return ResponseEntity.ok("Resume uploaded and questions generated successfully.");
    }
}