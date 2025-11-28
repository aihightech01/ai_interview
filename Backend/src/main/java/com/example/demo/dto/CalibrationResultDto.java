package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CalibrationResultDto {

    // Python(snake_case) JSON 키를 Java(camelCase) 필드에 매핑
    @JsonProperty("gaze_yaw")
    private Double gazeYaw;

    @JsonProperty("gaze_pitch")
    private Double gazePitch;

    @JsonProperty("head_yaw")
    private Double headYaw;

    @JsonProperty("head_pitch")
    private Double headPitch;
    
}