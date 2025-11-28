package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class VideoInfoDto {
    private Long videoNo;
    private String thumbnailDir;
    private Long questionNo;
    private String content;
    private String videoDir;
}