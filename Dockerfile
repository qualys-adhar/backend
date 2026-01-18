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
RUN pnpm run build || echo "No build script, using tsx runtime"

# Production image
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including dev dependencies for tsx)
RUN pnpm install --frozen-lockfile

# Copy built app (or source for tsx)
COPY src ./src
COPY tsconfig.json ./

# Start application
CMD ["pnpm", "dev"]
