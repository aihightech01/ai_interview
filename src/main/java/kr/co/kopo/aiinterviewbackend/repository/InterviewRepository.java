package kr.co.kopo.aiinterviewbackend.repository;

import kr.co.kopo.aiinterviewbackend.domain.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    // 비어있는 게 정상입니다!
    // JpaRepository를 상속받는 것만으로도 기본적인 CRUD(Create, Read, Update, Delete)
    // 기능(save(), findById(), findAll(), delete() 등)이 자동으로 구현됩니다.
}