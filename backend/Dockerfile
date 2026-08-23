FROM node:20-alpine

WORKDIR /app

# copy package.json ก่อนเพื่อใช้ Docker layer cache — ถ้า dependency ไม่เปลี่ยน ไม่ต้อง npm install ใหม่ทุกครั้ง
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

# dev mode: ใช้ nodemon (script "dev" ใน package.json) จะได้ hot reload ตอนแก้โค้ด
CMD ["npm", "run", "dev"]
