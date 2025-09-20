# AI 기반 다중 모달 분석을 활용한 모의 면접 플랫폼

## 프로젝트 소개

비전 AI와 LLM을 통해 면접자의 집중도, 감정, 답변을 융합적으로 분석하는 모의 면접 시스템입니다. 기존 시스템의 독립적 평가 방식을 넘어 종합적 피드백과 지속적 성장 지원을 제공합니다.

## 주요 기능

- **다중 모달 분석**: 비전 AI와 LLM을 활용한 집중도, 감정, 답변 종합 분석
- **개인화 면접**: 자소서 기반 맞춤형 질문 생성
- **진도 추적**: 이전 연습 대비 향상 부분 피드백
- **실시간 분석**: 면접 진행 중 실시간 데이터 수집 및 분석

## 기술 스택

### Backend
- Java, Spring Boot
- Spring Data JPA
- Oracle Database
- REST API

### Frontend  
- React
- Figma (UI/UX 디자인)

### AI/ML
- Vision AI (집중도, 감정 분석)
- LLM (답변 분석 및 피드백)
- STT (음성-텍스트 변환)

## 팀 구성

### Backend 개발
- **신성진**: 면접 선택, 자소서 업로드, 문항 리스트 관리
- **황제윤**: 기기 테스트, 캘리브레이션, 면접 진행, 메인 페이지
- **이우주**: 사용자 인증, 마이페이지, 분석 결과 페이지

### Frontend 개발
- **신윤섭**: 문항 리스트, 면접 화면, 자소서 업로드, 기기 테스트
- **김은혜**: 분석 결과, 마이페이지, 사용자 인증, 메인 페이지

## 시스템 아키텍처

### 데이터베이스 구조
- **사용자 DB**: 회원 정보, 로그인 관리
- **면접 설정 DB**: 면접 유형, 질문 구성
- **캘리브레이션 DB**: 기기 테스트 결과
- **개인 문항 DB**: 사용자 커스텀 질문
- **공통 문항 DB**: 기본 면접 질문
- **영상 결과 DB**: 면접 영상 및 분석 데이터
- **분석 DB**: AI 분석 결과 (집중도, 감정, 답변)

### API 설계
```
POST /api/interview/select      # 면접 유형 선택
POST /api/resume/upload         # 자소서 업로드
GET  /api/questions            # 질문 리스트 조회
POST /api/questions/custom     # 커스텀 질문 추가
POST /api/interview/start      # 면접 시작
POST /api/analysis/video       # 영상 분석 요청
GET  /api/results/{sessionId}  # 분석 결과 조회
```

## 주요 기능 상세

### 면접 진행 프로세스
1. **면접 선택**: 모의면접/실제면접 선택
2. **자소서 입력**: 파일 업로드 또는 텍스트 직접 입력
3. **질문 설정**: 기본 질문 + 개인화 질문 구성
4. **기기 테스트**: 카메라, 마이크 동작 확인
5. **캘리브레이션**: 정자세 기준점 설정
6. **면접 진행**: 실시간 녹화 및 답변 수집
7. **결과 분석**: AI 기반 종합 분석 및 피드백

### 분석 결과 제공 데이터
1. STT 변환된 답변 텍스트
2. 답변의 긍정적 요소
3. 답변의 부정적 요소  
4. 구체적인 답변 개선안
5. 종합 점수
6. 전체 총평 (집중도 + 감정 + 답변 통합)
7. 면접 영상 스트리밍
8. 시간대별 감정 분석 데이터
9. 시간대별 집중도 분석 데이터

## 설치 및 실행

### 필수 요구사항
- Java 11 이상
- Node.js 16 이상
- Oracle Database
- Git

### 로컬 개발 환경 설정
```bash
# 저장소 클론
git clone [repository-url]

# Backend 실행
cd backend
./gradlew bootRun

# Frontend 실행  
cd frontend
npm install
npm start
```

## 개발 진행 상황

### 완료된 기능
- [x] 데이터베이스 설계
- [x] 기본 프론트엔드 페이지 구성
- [x] 사용자 인증 시스템

### 진행 중인 기능
- [ ] 자소서 업로드 및 처리
- [ ] AI 모델 통합
- [ ] 실시간 분석 시스템
- [ ] 분석 결과 시각화

### 향후 개발 계획
- [ ] 모바일 반응형 지원
- [ ] 면접 패턴 학습 기능
- [ ] 다국어 지원

## 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 참고 자료

- [Figma 디자인](https://www.figma.com/design/U50PcJUIKzBrpa1PO53P6Z/ai-면접-코치-윤섭-)
- [벤치마킹 프로젝트들](https://github.com/o-star/AI_Mock_Interview_System)
- [팀 회의록](회의록-링크)

## 라이센스

이 프로젝트는 교육 목적으로 개발되었습니다.

## 연락처

프로젝트 관련 문의사항은 팀 리더에게 연락 바랍니다.
