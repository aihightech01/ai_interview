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

    @PostMapping("/upload")
    public ResponseEntity<String> uploadResume(@ModelAttribute ResumeUploadRequestDto requestDto) throws TikaException, IOException {
        // 서비스의 올바른 메서드 이름을 호출합니다.
        resumeService.saveResumeWithTextAndFile(
                requestDto.getUserId(),
                requestDto.getTextContent(),
                requestDto.getResumeFile()
        );
        return ResponseEntity.ok("Resume uploaded successfully.");
    }
}