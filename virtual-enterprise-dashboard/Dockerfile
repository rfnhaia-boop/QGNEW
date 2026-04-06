# ============================================
# NEW HOLDING — Dockerfile para produção
# ============================================

# Stage 1: Instalar dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente do build
ARG GOOGLE_AI_API_KEY
ENV GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Runner (imagem final mínima)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar user não-root por segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar apenas o necessário
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
