package com.example.demo.dto;

import com.example.demo.domain.InterviewEntity;
import com.example.demo.domain.QuestionEntity;
import com.example.demo.domain.VideoEntity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoDto {
    private Long videoNO;
    private Long interviewNO;   // InterviewEntity의 PK를 참조
    private Long questionNO;    // QuestionEntity의 PK를 참조
    private String videoDir;
    private String thumbnailDir;
    private int frames;
    
    public VideoEntity toEntity(InterviewEntity interviewEntity, QuestionEntity questionEntity) {
        return VideoEntity.builder()
            .videoNO(this.videoNO)
            .interview(interviewEntity)
            .question(questionEntity)
            .videoDir(this.videoDir)
            .thumbnailDir(this.thumbnailDir)
            .frames(this.frames)
            .build();
    }
}