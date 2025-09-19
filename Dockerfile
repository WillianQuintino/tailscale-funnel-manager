# Use Node.js Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    docker-cli \
    bash \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Install Tailscale
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Set environment variables
ENV NODE_ENV=production
ENV TS_STATE_DIR=/var/lib/tailscale
ENV AUTH_ENABLED=false
ENV AUTH_TYPE=tailscale

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create necessary directories
RUN mkdir -p /var/lib/tailscale /app/data

# Copy and set up start script
COPY scripts/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/tailscale/status || exit 1

# Start the application with our custom script
CMD ["/usr/local/bin/start.sh"]