package com.example.interviewaiserver.repository;

import com.example.interviewaiserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, String> { // ID 타입을 String으로 지정
}