# Node.js 베이스 이미지
FROM node:22-alpine

# 작업 디렉토리
WORKDIR /app

# package.json 먼저 복사 후 설치
COPY package*.json ./
RUN npm install
RUN npm ci

# 소스 복사
COPY . .

EXPOSE 5173
ENV CHOKIDAR_USEPOLLING=true

# Vite 개발 서버 실행
CMD ["npm", "run", "dev", "--", "--host"]
