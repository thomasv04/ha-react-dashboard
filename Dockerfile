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
# Stage 2 — Production: Node.js server + jq
# ────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install jq for parsing /data/options.json and bash for run.sh
RUN apk add --no-cache jq bash

# Install ONLY production dependencies (Express)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the Node.js backend server
COPY server.js .

# Copy the startup script
COPY rootfs/run.sh /run.sh
RUN chmod +x /run.sh

# Copy React build output from Stage 1
COPY --from=builder /app/dist /app/dist

# HA Add-on standard ingress port
EXPOSE 8099

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8099/ || exit 1

# Start the run script
CMD [ "/run.sh" ]