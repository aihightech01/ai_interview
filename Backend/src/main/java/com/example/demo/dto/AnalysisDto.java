package com.example.demo.dto;

import com.example.demo.domain.AnalysisEntity;
import com.example.demo.domain.VideoEntity;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisDto {
    private Long videoNO;
    private VideoEntity video;
    private String vision;
    private String emotion;
    private String answer;

    public AnalysisEntity toEntity(VideoEntity videoEntity) {
        return AnalysisEntity.builder()
                .videoNO(this.videoNO)
                .video(videoEntity)
                .vision(this.vision)
                .emotion(this.emotion)
                .answer(this.answer)
                .build();
    }
}