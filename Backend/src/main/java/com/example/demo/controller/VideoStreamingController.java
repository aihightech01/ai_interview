package com.example.demo.controller;

import java.io.IOException;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaTypeFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;

import com.example.demo.domain.VideoEntity;
import com.example.demo.repository.VideoRepository;

@RestController
@RequestMapping("/videos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VideoStreamingController {
    private final VideoRepository videoRepository;

    // HTTP Range 지원 영상 스트리밍
    @GetMapping("/stream/{videoNo}")
    public ResponseEntity<ResourceRegion> streamVideo(
            @PathVariable("videoNo") Long videoNo,
            @RequestHeader HttpHeaders headers) throws IOException {
        
        VideoEntity video = videoRepository.findById(videoNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));

        FileSystemResource resource = new FileSystemResource(video.getVideoDir());
        
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Video file not found or not readable");
        }

        // Range 요청이 오면 해당 바이트만 응답
        long contentLength = resource.contentLength();
        ResourceRegion region;

        if (headers.getRange() != null && !headers.getRange().isEmpty()) {
            HttpRange range = headers.getRange().get(0);
            long start = range.getRangeStart(contentLength);
            long end = range.getRangeEnd(contentLength);
            long rangeLength = Math.min(1024 * 1024, end - start + 1); // 1MB씩 전송
            region = new ResourceRegion(resource, start, rangeLength);
        } else {
            long rangeLength = Math.min(1024 * 1024, contentLength);
            region = new ResourceRegion(resource, 0, rangeLength);
        }

        MediaType mediaType = MediaTypeFactory.getMediaType(resource)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);

        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .contentType(mediaType)
                .body(region);
    }
}
