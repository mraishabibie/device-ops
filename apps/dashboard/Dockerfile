# Stage 1: Build Next.js Dashboard
FROM node:lts-alpine AS builder

WORKDIR /workspace

# Copy package config
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy project files
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Runner instance
FROM node:lts-alpine AS runner

WORKDIR /workspace

ENV NODE_ENV=production

# Copy necessary build artifacts
COPY --from=builder /workspace/package*.json ./
COPY --from=builder /workspace/public ./public
COPY --from=builder /workspace/.next ./.next
COPY --from=builder /workspace/node_modules ./node_modules

EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
