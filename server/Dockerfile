# === HeatWave PvP — Server Dockerfile ===
# Multi-stage build: shared + server

FROM node:20-slim AS builder

WORKDIR /app

# Copy shared library
COPY shared/ ./shared/

# Copy server
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm install

COPY server/ ./
RUN npm run build

# --- Production stage ---
FROM node:20-slim

WORKDIR /app

# Copy shared (needed at runtime for TypeScript paths)
COPY --from=builder /app/shared/ ./shared/

# Copy server build output and dependencies
COPY --from=builder /app/server/dist/ ./server/dist/
COPY --from=builder /app/server/node_modules/ ./server/node_modules/
COPY --from=builder /app/server/package.json ./server/

WORKDIR /app/server

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/index.js"]
