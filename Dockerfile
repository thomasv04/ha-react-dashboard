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
# Stage 2 — Production: nginx + jq for runtime config injection
# ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# jq to parse /data/options.json; bash for run.sh
RUN apk add --no-cache jq bash

# Nginx configuration for SPA with HA add-on port
COPY rootfs/etc/nginx/nginx.conf /etc/nginx/nginx.conf

# Startup script: reads /data/options.json and writes env-config.js
COPY rootfs/run.sh /run.sh
RUN chmod +x /run.sh

# React build output
COPY --from=builder /app/dist /usr/share/nginx/html

# HA Add-on standard ingress port
EXPOSE 8099

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8099/index.html || exit 1

CMD ["/run.sh"]
