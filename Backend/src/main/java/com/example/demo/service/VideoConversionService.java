package com.example.demo.service;

import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.FFmpegFrameRecorder;
import org.bytedeco.javacv.Frame;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import static org.bytedeco.ffmpeg.global.avcodec.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class VideoConversionService {

    /**
     * MultipartFile을 받아서 MP4 형식의 임시 파일로 변환합니다.
     * @param multipartFile 변환할 원본 비디오 파일 (예: .webm)
     * @return 변환된 MP4 형식의 임-시 파일 객체
     * @throws IOException 파일 처리 중 예외 발생
     */
	public File convertToMp4(MultipartFile multipartFile) throws IOException {
	    System.out.println("인코딩 시작");

	    Path tempFilePath = Files.createTempFile("temp_video_", multipartFile.getOriginalFilename());
	    File sourceFile = tempFilePath.toFile();
	    multipartFile.transferTo(sourceFile);

	    String outputFileName = "converted_" + System.currentTimeMillis() + ".mp4";
	    File outputFile = new File(sourceFile.getParent(), outputFileName);

	    long startTime = System.currentTimeMillis();
	    try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(sourceFile)) {
	        grabber.start();

	        try (FFmpegFrameRecorder recorder = new FFmpegFrameRecorder(outputFile, grabber.getImageWidth(), grabber.getImageHeight(), grabber.getAudioChannels())) {
	            recorder.setVideoCodec(AV_CODEC_ID_H264);
	            recorder.setFormat("mp4");
	            recorder.setFrameRate(grabber.getFrameRate());
	            recorder.setSampleRate(grabber.getSampleRate());
	            recorder.setAudioCodec(AV_CODEC_ID_AAC);
	            recorder.setVideoBitrate(grabber.getVideoBitrate() > 0 ? grabber.getVideoBitrate() : 2000000);
	            recorder.setAudioBitrate(grabber.getAudioBitrate() > 0 ? grabber.getAudioBitrate() : 192000);

	            recorder.start();
	            Frame frame;
	            while ((frame = grabber.grabFrame()) != null) {
	                if (frame.timestamp >= 0) {
	                    recorder.setTimestamp(frame.timestamp);
	                } else {
	                    long timestamp = (System.currentTimeMillis() - startTime) * 1000; // microseconds 단위
	                    recorder.setTimestamp(timestamp);
	                }
	                recorder.record(frame);
	            }
	            recorder.stop();
	        } finally {
	            grabber.stop();
	        }
	    } finally {
	        if (!sourceFile.delete()) {
	            System.out.println("임시 파일 삭제 실패" + sourceFile.getAbsolutePath());
	        }
	    }


	    System.out.println("인코딩 완료");
	    return outputFile;
	}
}