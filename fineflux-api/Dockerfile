# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────
# Stage 1 — deps: install production dependencies only
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# ─────────────────────────────────────────────
# Stage 2 — runner: minimal runtime image
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# Business runs in IST; naive datetime strings (no UTC offset) from the frontend must
# resolve against IST, not whatever timezone the container host defaults to.
ENV TZ=Asia/Kolkata

# dumb-init for proper signal handling (graceful shutdown)
RUN apk add --no-cache dumb-init

# Run as the built-in non-root "node" user
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node src ./src

USER node

EXPOSE 8080

# Healthcheck hits the existing /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8080)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
