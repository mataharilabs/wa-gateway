FROM node:20-slim

# git: Baileys menarik dependensi (libsignal) dari GitHub.
# python3/make/g++: untuk kompilasi native addon (node-gyp) bila diperlukan.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps dulu (cache layer)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

# Sesi WhatsApp disimpan di volume persisten (mount /data di Railway)
ENV DATA_DIR=/data/auth
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
