# ────────────────────────────────────────────────────────────
# Stage 1 — Build React app (no credentials baked in)
# Always run on amd64: Node/V8 hits illegal-instruction under QEMU ARM emulation.
# The output is platform-agnostic static files (HTML/JS/CSS).
# ────────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# Copy manifests first to leverage Docker layer cache
COPY package*.json ./
RUN npm ci

# Copy source (excluding files listed in .dockerignore if present)
COPY . .

# Build as add-on SPA (base path = "/", output to dist/)
RUN VITE_ADDON=true npm run build

# ────────────────────────────────────────────────────────────
# Stage 2 — Production: Node.js + Express + SQLite
# ────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install ONLY production dependencies (Express + SQLite)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the Node.js backend server
COPY server.js .
COPY server/ ./server/

# Créer le dossier data pour SQLite
RUN mkdir -p /data

# Environment variables
ENV DB_PATH=/data/dashboard.db
ENV NODE_ENV=production
# Enable HA auth middleware in ingress mode (SUPERVISOR_TOKEN injected by HA)
ENV HA_AUTH=true
ENV HA_AUTH_MODE=ingress

# Copy React build output from Stage 1
COPY --from=builder /app/dist /app/dist

# HA Add-on standard ingress port
EXPOSE 8099

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8099/ || exit 1

CMD [ "node", "server.js" ]