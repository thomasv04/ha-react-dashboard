# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build React app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the static build
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist /app/dist

# Set environment variables for HA integration
ENV VITE_HA_URL=http://homeassistant:8123
ENV VITE_NO_AUTH=true
ENV NODE_ENV=production

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5173/index.html || exit 1

# Run the app with serve
CMD ["serve", "-s", "dist", "-l", "5173"]
