package com.example.interviewaiserver.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
public class ResumeUploadRequestDto {
    private String userId;
    private String textContent;
    private MultipartFile resumeFile;
}