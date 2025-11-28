package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.domain.UserEntity;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, String> {
    // Basic CRUD methods (save, findById, findAll, delete, etc.) are provided automatically.
    // You can add custom query methods here if needed.
    // Example: Optional<UserEntity> findByEmail(String email);
}