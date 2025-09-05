package kr.co.kopo.aiinterviewbackend.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity // 이 클래스가 데이터베이스 테이블과 매핑되는 '엔티티'임을 선언합니다.
@Getter // Lombok: 모든 필드의 Getter 메소드를 자동으로 생성합니다.
@Setter // Lombok: 모든 필드의 Setter 메소드를 자동으로 생성합니다.
@NoArgsConstructor // Lombok: 파라미터가 없는 기본 생성자를 자동으로 생성합니다. (JPA에서 필수)
public class Interview {

    @Id // 이 필드가 테이블의 기본 키(Primary Key)임을 나타냅니다.
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 기본 키 값을 DB가 자동으로 1씩 증가시키도록 합니다. (MySQL에 적합)
    private Long id;

    @Column(nullable = false) // 'question' 컬럼을 만들고, 비어있을 수 없도록(NOT NULL) 설정합니다.
    private String question;

    @Column(columnDefinition = "TEXT") // 'answer' 컬럼을 만들고, 긴 텍스트를 저장할 수 있는 TEXT 타입으로 지정합니다.
    private String answer;
}