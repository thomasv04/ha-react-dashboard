# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# hadolint ignore=DL3006
# Set build environment variables (not secrets - just regular config)
# These are used during the build process to configure Vite output
# Note: For Add-on, VITE_FOLDER_NAME is set to 'ha-dashboard' (served from /local/ha-dashboard/)
# Default (HACS) would be 'community/ha-react-dashboard' (served from /local/community/ha-react-dashboard/)
ARG VITE_FOLDER_NAME=ha-dashboard
ARG VITE_HA_URL=http://homeassistant:8123
ARG VITE_NO_AUTH=true

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build React app with environment variables
RUN VITE_FOLDER_NAME=$VITE_FOLDER_NAME \
    VITE_HA_URL=$VITE_HA_URL \
    VITE_NO_AUTH=$VITE_NO_AUTH \
    npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the static build
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist /app/dist

# Set environment variables for HA integration at runtime
ENV VITE_HA_URL=http://homeassistant:8123
ENV VITE_NO_AUTH=true
ENV NODE_ENV=production

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5173/index.html || exit 1

# Run the app with serve
CMD ["serve", "-s", "dist", "-l", "5173"]
