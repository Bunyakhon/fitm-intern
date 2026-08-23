# ===== Stage 1: build =====
FROM node:22-alpine AS build

WORKDIR /app

# copy package.json ก่อนเพื่อใช้ Docker layer cache
COPY package*.json ./
RUN npm install

COPY . .

# VITE_API_URL ตั้งตอน build (baked เข้าไปใน bundle เพราะเป็น static site)
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ===== Stage 2: serve =====
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
