# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────
# Stage 1 — deps: install ALL deps (incl. dev) for the build
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ─────────────────────────────────────────────
# Stage 2 — build: compile TypeScript -> dist
# ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─────────────────────────────────────────────
# Stage 3 — prod-deps: install ONLY production deps
# ─────────────────────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# ─────────────────────────────────────────────
# Stage 4 — runner: minimal runtime image
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# dumb-init for proper signal handling (graceful shutdown)
RUN apk add --no-cache dumb-init

# Run as the built-in non-root "node" user
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

USER node

EXPOSE 8080

# Healthcheck hits the existing /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8080)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]