package kr.co.kopo.aiinterviewbackend.controller;

import kr.co.kopo.aiinterviewbackend.dto.InterviewSaveRequestDto;
import kr.co.kopo.aiinterviewbackend.domain.Interview;
import kr.co.kopo.aiinterviewbackend.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController // 이 클래스가 RESTful API의 컨트롤러임을 나타냅니다.
@RequiredArgsConstructor // final 키워드가 붙은 필드를 위한 생성자를 자동으로 만들어줍니다. (의존성 주입)
public class InterviewController {

    // final로 선언하여 반드시 초기화되도록 강제하고, @RequiredArgsConstructor가 생성자를 통해 주입해줍니다.
    private final InterviewRepository interviewRepository;

    // 1. 데이터 생성(Create) API
    @PostMapping("/api/interviews")
    public Interview createInterview(@RequestBody InterviewSaveRequestDto requestDto) {
        return interviewRepository.save(requestDto.toEntity());
    }

    // 2. ID로 데이터 조회(Read) API
    @GetMapping("/api/interviews/{id}")
    public Interview getInterview(@PathVariable Long id) {
        return interviewRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 ID의 데이터를 찾을 수 없습니다: " + id));
    }
}