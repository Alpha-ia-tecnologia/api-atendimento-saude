# syntax=docker/dockerfile:1.7

# ============================================================
# Stage 1: deps — instala TODAS as deps (dev + prod) cacheável
# ============================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
# Prisma é dep dev: precisa estar disponível durante o build
RUN npm ci --no-audit --no-fund

# ============================================================
# Stage 2: builder — gera client Prisma + compila TS
# ============================================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

ENV NODE_ENV=production

RUN npx prisma generate
RUN npm run build

# ============================================================
# Stage 3: prod-deps — só dependências de runtime (imagem leve)
# ============================================================
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# Regenera o client Prisma nesse node_modules (precisa do schema)
COPY prisma ./prisma
RUN npx --yes prisma@5 generate

# ============================================================
# Stage 4: runner — imagem final mínima
# ============================================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl tini
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_LOGLEVEL=warn

# Usuário sem privilégios
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

# Artefatos do build
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder   --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder   --chown=nestjs:nodejs /app/prisma ./prisma
COPY --chown=nestjs:nodejs package.json ./

USER nestjs

EXPOSE 3000

# Healthcheck simples — EasyPanel/Traefik se beneficiam disso pra
# saber quando o container ficou saudável após restart.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/docs >/dev/null 2>&1 || exit 1

# tini gerencia sinais (SIGTERM ao deploy → graceful shutdown)
ENTRYPOINT ["/sbin/tini", "--"]

# Aplica migrações pendentes antes de subir o servidor.
# `prisma migrate deploy` é idempotente — só roda o que ainda não foi aplicado.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
