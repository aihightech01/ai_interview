package com.example.demo.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserProfileResponseDto {
    private Long videoNo;
    private String thumbnailDir;
    private String videoDir;
    private Long questionNo;
    private String questionContent;
    private AnalysisDto analysis;
    private CalibrationDto calibration; 
    private String videoStreamUrl;
}