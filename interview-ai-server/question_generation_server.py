import os
import re
import requests
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

load_dotenv()

# --- 설정 ---
LLM_API_URL = os.getenv("LLM_API_URL", "http://127.0.0.1:1234/v1/chat/completions")
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "deepseek-r1-distill-qwen-14b")

# --- FastAPI 앱 생성 ---
app = FastAPI()

# --- 요청/응답 데이터 모델 정의 ---
class ResumeRequest(BaseModel):
    resume_text: str

class QuestionResponse(BaseModel):
    questions: list[str]

# --- 핵심 로직 ---
def generate_questions_from_llm(text: str) -> list[str]:
    headers = {"Content-Type": "application/json"}

    prompt = f"""자기소개서 내용:
---
{text.strip()}
---
위 자기소개서 내용을 기반으로, 웹 프로그래머 신입 면접 질문 3개를 만들어줘.
- 반드시 한국어로 답변해줘.
- 심층적인 답변이 필요한 질문이어야 해.
- 질문 외에 다른 설명이나 번호는 붙이지 말고, 각 질문은 줄바꿈으로만 구분해줘."""

    data = {
      "model": LLM_MODEL_NAME,
      "messages": [{"role": "user", "content": prompt}],
      "max_tokens": 2048,
      "temperature": 0.7,
      "stop": ["<think>", "</think>"]
    }

    try:
        response = requests.post(LLM_API_URL, headers=headers, json=data, timeout=85)
        response.raise_for_status()

        result = response.json()
        answer = result['choices'][0]['message']['content'].strip()

        answer = re.sub(r'^\d+\.\s*', '', answer, flags=re.MULTILINE)

        questions = [q.strip() for q in answer.split('\n') if q.strip()]
        return questions

    except requests.exceptions.Timeout:
        print("LLM API 호출 시간 초과 (85초)")
        return ["LLM 응답 시간 초과"]
    except Exception as e:
        print(f"LLM API 처리 중 에러 발생: {e}")
        return []

# --- API 엔드포인트 정의 ---
@app.post("/generate-questions", response_model=QuestionResponse)
def handle_question_generation(request: ResumeRequest):
    generated_questions = generate_questions_from_llm(request.resume_text)
    return QuestionResponse(questions=generated_questions)

# --- 서버 실행 ---
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5001)