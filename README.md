#  AI 면접 연습 웹 서비스

> **자기소개서 기반 질문 생성 → 면접 진행(STT) → 감정·집중도 분석 → 종합 피드백 제공**  
> 실제 면접과 거의 동일한 흐름으로 연습할 수 있는 **AI 모의 면접 웹 서비스**입니다.

---

# 📑 목차
1. [웹 서비스 소개](#웹-서비스-소개)
2. [기술 스택](#기술-스택)
3. [주요 기능](#주요-기능)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [서비스 화면](#서비스-화면)
6. [개발 팀 소개](#개발-팀-소개)
7. [개발 기간 및 일정](#개발-기간-및-일정)
8. [산출물](#산출물)

---

# 🌐 웹 서비스 소개

AI를 활용해 사용자가 **실제 면접처럼 자연스럽게 연습**할 수 있도록 설계된 웹 서비스입니다.  

- 자기소개서를 분석해 **맞춤형 질문 자동 생성**
- 실시간 **STT 음성 인식**을 통한 답변 기록
- 감정·시선 기반 **면접 태도 분석**
- 전체 흐름을 시각화한 **종합 리포트 제공**

---

# 🛠 기술 스택

### **Frontend**
[![stackticon](https://firebasestorage.googleapis.com/v0/b/stackticon-81399.appspot.com/o/images%2F1764226945338?alt=media&token=127c7fe1-edae-46c9-a109-5cb403536df0)](https://github.com/msdio/stackticon)

### **Backend / AI**
- STT API
- Emotion Detection API
- Gemini API
- WebRTC (카메라 캘리브레이션)

### **분석 기술**
- Speech-to-Text (STT)
- Emotion Analysis
- Face & Gaze Tracking
- Time-Series Analysis

---

# ⭐ 주요 기능

## 1) 자기소개서 기반 질문 생성
- 자기소개서를 분석해 맞춤형 면접 질문 자동 생성  
- 기본 질문 세트 제공  
- 임의 문장 기반 질문 생성 기능

## 2) STT 기반 면접 진행
- 실시간 음성 → 텍스트 변환(STT)  
- 질문/답변 자동 로그 기록

## 3) 시계열(Time-Series) 기반 분석
- 발화 속도 변화  
- 감정 변화(긍정 / 중립 / 부정)  
- 발화량 및 답변 길이  
- 결과 차트 시각화

## 4) 집중도·시선 분석
- WebRTC 기반 캘리브레이션  
- 정면/측면/화면 방향 분석  
- 표정 변화 기반 감정 분석

## 5) 종합 피드백 리포트
- 답변 구조/논리성 평가  
- 시선 처리·전달력 분석  
- 개선해야 할 포인트 자동 제시

---

# 🏗 시스템 아키텍처

```
Frontend (React)
      ↓
API Server (Node.js / Express)
      ↓
AI Engine (Gemini / STT / Emotion)
      ↓
Time-Series Analyzer
      ↓
Report Generator
      ↓
Frontend UI
```

---

# 🖥 서비스 화면  
(스크린샷 추가 예정)

---

# 🧑‍💻 개발 팀 소개

<div align="center">

| **이우주** | **황제윤** | **신성진** | **신윤섭** | **김은혜** |
|-----------|------------|------------|------------|------------|
| <img src="https://github.com/LWJOO.png" width="120" /> | <img src="https://github.com/JeyunH.png" width="120" /> | <img src="https://github.com/SSSSJIN.png" width="120" /> | <img src="https://github.com/laluter.png" width="120" /> | <img src="https://github.com/eeeunhey.png" width="120" /> |
| BE | BE | BE | FE | FE |
| <a href="https://github.com/LWJOO">LWJOO</a> | <a href="https://github.com/JeyunH">JeyunH</a> | <a href="https://github.com/SSSSJIN">SSSSJIN</a> | <a href="https://github.com/laluter">laluter</a> | <a href="https://github.com/eeeunhey">eeeunhey</a> |

</div>

---

# 🗓 개발 기간 및 일정

| 기간 | 내용 |
|------|--------|
| 2025.09.xx ~ 2025.09.xx | 기획 및 와이어프레임 |
| 2025.10.xx ~ 2025.10.xx | FE/BE 개발 |
| 2025.10.xx ~ 2025.10.xx | AI 모델 연동 및 기능 구현 |
| 2025.10.xx ~ 2025.10.xx | 테스트 및 리팩토링 |

---

# 📂 산출물

- 기획서  
- 와이어프레임 / 디자인 시안  
- ERD / 아키텍처 문서  
- 분석 알고리즘 명세  
- 최종 리포트 샘플  
- 발표 자료(PPT)
