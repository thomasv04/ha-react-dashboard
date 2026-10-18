# ────────────────────────────────────────────────────────────
# Stage 1 — Build React app (no credentials baked in)
# Always run on amd64: Node/V8 hits illegal-instruction under QEMU ARM emulation.
# The output is platform-agnostic static files (HTML/JS/CSS).
#
# Debian (glibc) et non Alpine : better-sqlite3 ne publie aucun binaire
# précompilé pour musl, quelle que soit sa version. Sur Alpine `npm ci` retombe
# donc sur node-gyp, qui réclame Python et un compilateur — et recompile
# l'amalgame sqlite3 à chaque build, sous QEMU pour l'image aarch64.
# Node 22 (et non 20) : better-sqlite3 12.11 a cessé de publier pour l'ABI 115.
# ────────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-slim AS builder

WORKDIR /app

# Copy manifests first to leverage Docker layer cache
COPY package*.json ./
# `--ignore-scripts` : better-sqlite3 13 livre ses binaires dans le paquet
# (`prebuilds/`) et se déclare `gypfile: false`, mais le npm 10 de l'image lit
# ses métadonnées dans le lockfile, qui n'enregistre pas ce champ : voyant
# `binding.gyp`, il lance `node-gyp rebuild`, qui échoue faute de Python. Le
# build n'a besoin d'aucun script d'installation (esbuild, ssh2… n'y servent pas).
RUN npm ci --ignore-scripts

# Copy source (excluding files listed in .dockerignore if present)
COPY . .

# Build as add-on SPA (base path = "/", output to dist/)
RUN VITE_ADDON=true npm run build

# ────────────────────────────────────────────────────────────
# Stage 2 — Production: Node.js + Express + SQLite
# ────────────────────────────────────────────────────────────
FROM node:22-slim

WORKDIR /app

# Install ONLY production dependencies (Express + SQLite)
COPY package*.json ./
# Aucune dépendance de production n'a de script d'installation : better-sqlite3
# charge le binaire précompilé du paquet (cf. l'étape builder).
RUN npm ci --omit=dev --ignore-scripts

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

# `fetch` est global depuis Node 18 : pas de wget/curl à installer, contrairement
# à l'image Alpine où wget venait avec busybox.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8099/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD [ "node", "server.js" ]