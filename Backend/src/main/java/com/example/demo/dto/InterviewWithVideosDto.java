package com.example.demo.dto;

import java.util.List;

import com.example.demo.domain.InterviewEntity;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InterviewWithVideosDto {
	private InterviewEntity interview;
    private List<VideoInfoDto> videos;

    public InterviewWithVideosDto(InterviewEntity interview, List<VideoInfoDto> videos) {
        this.interview = interview;
        this.videos = videos;
    }

    // getters & setters
}
