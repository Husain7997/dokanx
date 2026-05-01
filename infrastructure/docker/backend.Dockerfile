# Backend Dockerfile
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for production
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dokanx -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from base stage
COPY --from=base --chown=dokanx:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=dokanx:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown -R dokanx:nodejs logs

# Switch to non-root user
USER dokanx

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]