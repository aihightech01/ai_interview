package kr.co.kopo.aiinterviewbackend.dto;

import kr.co.kopo.aiinterviewbackend.domain.Interview;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter // DTO는 Controller에서 값을 채워야 하므로 Setter가 필요합니다.
@NoArgsConstructor
public class InterviewSaveRequestDto {

    private String question;
    private String answer;

    // DTO 객체를 Entity 객체로 변환해주는 메소드
    public Interview toEntity() {
        Interview interview = new Interview();
        interview.setQuestion(this.question);
        interview.setAnswer(this.answer);
        return interview;
    }
}