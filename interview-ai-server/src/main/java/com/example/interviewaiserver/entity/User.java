package com.example.interviewaiserver.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "USER_DB")
public class User {
    @Id
    @Column(name = "ID")
    private String id;

    @Column(name = "비밀번호")
    private String password;
    
    @Column(name = "본명")
    private String realName;

    @Column(name = "이메일")
    private String email;
}