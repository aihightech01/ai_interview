package com.example.demo.dto;

import com.example.demo.domain.UserEntity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {

    private String id;
    private String pw;
    private String name;
    private String email;
    
    public UserEntity toEntity() {
        return UserEntity.builder()
                .id(this.id)
                .pw(this.pw)
                .name(this.name)
                .email(this.email)
                .build();
    }
}