package com.example.demo.dto;

import com.example.demo.domain.CalibrationEntity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CalibrationDto {
    private Long caliNo;
    private Double gazePitch;
    private Double gazeYaw;
    private Double headPitch;
    private Double headYaw;
    // fromEntity 정적 메서드로 변환

    public static CalibrationDto fromEntity(CalibrationEntity entity) {
        return CalibrationDto.builder()
            .caliNo(entity.getCaliNO())
            .gazePitch(entity.getGazePitch())
            .gazeYaw(entity.getGazeYaw())
            .headPitch(entity.getHeadPitch())
            .headYaw(entity.getHeadYaw())
            .build();
    }
}
