# Frontend Dockerfile for Next.js applications
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependencies
COPY --from=base /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dokanx -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=dokanx:nodejs /app/.next ./.next
COPY --from=builder --chown=dokanx:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=dokanx:nodejs /app/package.json ./package.json
COPY --from=builder --chown=dokanx:nodejs /app/public ./public
COPY --from=builder --chown=dokanx:nodejs /app/next.config.* ./

# Switch to non-root user
USER dokanx

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]