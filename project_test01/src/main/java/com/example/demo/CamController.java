package com.example.demo;


import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.io.FileSystemResource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.io.File;
import java.io.IOException;

@Controller
public class CamController {

    private static final String UPLOAD_PATH = "C:/ai_project01/uploaded_videos/";
    private static final String FASTAPI_URL = "http://localhost:8000/process_video";

    @GetMapping("/")
    public String camPage() {
        return "cam"; // cam.jsp 연결
    }

    @PostMapping("/uploadVideo")
    @ResponseBody
    public ResponseEntity<String> uploadVideo(@RequestParam("file") MultipartFile file,
                                              @RequestParam("text") String text) { 
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("파일이 비어있습니다.");
        }
        try {
            String filePath = UPLOAD_PATH + file.getOriginalFilename();
            File dest = new File(filePath);
            file.transferTo(dest);

            String fastapiResponse = sendToFastAPI(dest, text); // text 전달
            return ResponseEntity.ok("FastAPI 처리 결과: " + fastapiResponse);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("서버 업로드 실패: " + e.getMessage());
        }
    }

    // sendToFastAPI 메서드에 text 파라미터 추가
    private String sendToFastAPI(File videoFile, String text) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();

        FileSystemResource fileResource = new FileSystemResource(videoFile);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);
        body.add("text", text);  // 텍스트 함께 추가
        System.out.print(body);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(FASTAPI_URL, requestEntity, String.class);
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                return "FastAPI 서버 오류 (코드: " + response.getStatusCodeValue() + ")";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "FastAPI 서버 연결 중 예외 발생: " + e.getMessage();
        }
    }
}