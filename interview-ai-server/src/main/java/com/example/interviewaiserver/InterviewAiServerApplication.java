package com.example.interviewaiserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@SpringBootApplication
public class InterviewAiServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(InterviewAiServerApplication.class, args);
    }


}