# Dockerfile for Node.js Backend
# Multi-stage build for production

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

# ✅ EXPOSE your app port (3000 is standard for Node)
EXPOSE 3000

# ✅ Use production start command (NOT dev)
CMD ["pnpm", "start"]
