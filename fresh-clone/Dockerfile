# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Asia/Kolkata

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bazaarGuru -u 1001

# Copy built application
COPY --from=build --chown=bazaarGuru:nodejs /app/dist ./dist
COPY --from=build --chown=bazaarGuru:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=bazaarGuru:nodejs /app/package*.json ./
COPY --from=build --chown=bazaarGuru:nodejs /app/public ./public

# Create necessary directories
RUN mkdir -p logs temp uploads && \
    chown -R bazaarGuru:nodejs logs temp uploads

# Switch to non-root user
USER bazaarGuru

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Labels for metadata
LABEL maintainer="bazaarGuru Team <dev@bazaarGuru.com>"
LABEL version="1.0.0"
LABEL description="bazaarGuru Telegram Bot - Coupon and Cashback Platform"
LABEL org.opencontainers.image.source="https://github.com/bazaarGuru/telegram-bot"