# ===================================
# Builder Stage
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# ===================================
# Production Stage
# ===================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    docker-cli \
    bash \
    ca-certificates \
    iptables \
    iproute2 \
    && rm -rf /var/cache/apk/*

# Install Tailscale binary only (don't run install script in Docker)
RUN apk add --no-cache tailscale

# Set environment variables
ENV NODE_ENV=production
ENV TS_STATE_DIR=/var/lib/tailscale
ENV AUTH_ENABLED=false
ENV AUTH_TYPE=tailscale
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002

# Copy package files
COPY package*.json ./

# Install production dependencies + typescript (needed for next.config.ts)
RUN npm ci --only=production && \
    npm install typescript @types/node && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Create necessary directories
RUN mkdir -p /var/lib/tailscale /app/data

# Create non-root user (but run as root for Tailscale)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/api/health || exit 1

# Start Tailscale daemon and Next.js app
CMD tailscaled -statedir=/var/lib/tailscale -tun=userspace-networking -socket=/var/run/tailscale/tailscaled.sock & \
    sleep 5 && \
    if [ ! -z "$TAILSCALE_AUTHKEY" ]; then \
        tailscale up --authkey=$TAILSCALE_AUTHKEY --accept-routes --hostname=funnel-manager; \
    fi && \
    npm start