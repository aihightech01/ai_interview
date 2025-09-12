package com.example.interviewaiserver.dto;

import lombok.Data;
import java.util.List;

@Data
public class PythonResponseDto {
    private List<String> questions;
}