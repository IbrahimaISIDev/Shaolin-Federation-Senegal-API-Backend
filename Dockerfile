# syntax=docker/dockerfile:1

# ---------- Build ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
# Le Chrome téléchargé par Puppeteer est compilé pour glibc et ne démarre pas
# sur Alpine (musl) : on utilise le Chromium du système (stage runtime).
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
# Chromium + polices pour la génération des PDF (licences, exports)
RUN apk add --no-cache openssl chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto
ENV NODE_ENV=production
ENV PORT=4000
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
