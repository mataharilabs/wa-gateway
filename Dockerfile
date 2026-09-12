FROM node:20-slim

WORKDIR /app

# Install deps dulu (cache layer)
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# Sesi WhatsApp disimpan di volume persisten (mount /data di Railway)
ENV DATA_DIR=/data/auth
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
