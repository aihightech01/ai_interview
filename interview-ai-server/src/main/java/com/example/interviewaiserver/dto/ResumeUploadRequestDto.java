package com.example.interviewaiserver.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter // ModelAttribute에서 필드 바인딩을 위해 Setter가 필요
public class ResumeUploadRequestDto {
    private String userId;
    private String interviewTitle; // 면접 제목을 받기 위한 필드 추가
    private String textContent;
    private MultipartFile resumeFile;
}