package com.example.demo.controller;

import com.example.demo.service.ResumeService;
import com.example.demo.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.apache.tika.exception.TikaException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final JwtUtil jwtUtil;

    private final ResumeService resumeService;

    @PostMapping("/upload/{interviewNo}")
    public ResponseEntity<Map<String, Boolean>> uploadResume(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("interviewNo") Long interviewNo,
            @RequestParam("interviewTitle") String interviewTitle,
            @RequestParam(value = "textContent", required = false) String textContent,
            @RequestParam(value = "resumeFile", required = false) MultipartFile resumeFile) throws IOException, TikaException {

        Map<String, Boolean> result = new HashMap<>();

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            result.put("message", false);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
        }

        String token = authHeader.replace("Bearer ", "");
        String id;

        try {
            id = jwtUtil.extractUserId(token);
        } catch (Exception e) {
            result.put("message", false);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
        }

        try {
            // interviewTitle은 항상 저장
            // textContent와 resumeFile이 모두 없으면 빈값 또는 null로 처리 가능
            resumeService.saveResumeAndGenerateQuestions(
                interviewNo,
                interviewTitle,
                textContent,
                resumeFile,
                id
            );

            result.put("message", true);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("message", false);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }
}