package com.example.interviewaiserver.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

@Getter
public class PythonRequestDto {

    // 💡 파이썬 서버가 요구하는 정확한 key 이름으로 수정합니다.
    @JsonProperty("resume_text") // "text" -> "resume_text"
    private final String resumeText;

    public PythonRequestDto(String resumeText) {
        this.resumeText = resumeText;
    }
}