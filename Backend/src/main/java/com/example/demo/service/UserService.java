package com.example.demo.service;

import com.example.demo.domain.UserEntity;
import com.example.demo.dto.UserDto;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
public class UserService {
    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // User 정보 조회 (UserDto 반환)
    public UserDto getUserById(String id) {
        return userRepository.findById(id)
                .map(user -> UserDto.builder()
                        .id(user.getId())
                        .pw(user.getPw())
                        .name(user.getName())
                        .email(user.getEmail())
                        .build())
                .orElse(null);
    }

    @Transactional
    public boolean registerUser(UserDto userDto) {
        if(userRepository.existsById(userDto.getId())) {
            return false; // 이미 존재하는 아이디
        }
        UserEntity userEntity = userDto.toEntity();
        userRepository.save(userEntity);
        return true;
    }

    public boolean loginUser(String id, String pw) {
        Optional<UserEntity> optionalUser = userRepository.findById(id);
        if(optionalUser.isPresent()) {
            return optionalUser.get().getPw().equals(pw);
        }
        return false;
    }

    // User 정보 수정 (DTO의 set 데이터로 변경)
    @Transactional
    public UserDto updateUserInfo(String id, UserDto newUserData) {
        return userRepository.findById(id).map(user -> {
            // DTO 값으로 set 변경
            user.setName(newUserData.getName());
            user.setEmail(newUserData.getEmail());
            if(newUserData.getPw() != null && !newUserData.getPw().isEmpty()) {
                user.setPw(newUserData.getPw());
            }
            UserEntity updatedUser = userRepository.save(user);
            return UserDto.builder()
                    .id(updatedUser.getId())
                    .pw(updatedUser.getPw())
                    .name(updatedUser.getName())
                    .email(updatedUser.getEmail())
                    .build();
        }).orElse(null);
    }

    public UserDto findUserById(String id) {
        return userRepository.findById(id)
                .map(user -> UserDto.builder()
                        .id(user.getId())
                        .pw(user.getPw())
                        .name(user.getName())
                        .email(user.getEmail())
                        .build())
                .orElse(null);
    }

    public boolean existsById(String id) {
        return userRepository.existsById(id);
    }

    @Transactional
    public int updateProfile(String userId, String pw, String newPw, String name, String email) {
        UserEntity user = userRepository.findById(userId).orElse(null);
        if (user == null) return 0;
        // 기존 비밀번호 검증
        if (!user.getPw().equals(pw)) return -1;
        if(newPw != null && !newPw.isEmpty()) user.setPw(newPw);
        if(name != null) user.setName(name);
        if(email != null) user.setEmail(email);
        userRepository.save(user);
        return 1;
    }
    
    public UserEntity findUserEntityById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자 ID: " + id));
    }
}
