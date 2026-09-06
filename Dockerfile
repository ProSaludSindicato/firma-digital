# Multi-stage image: only the auto-sign Node API (no frontend)
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server
COPY tsconfig.server.json ./
RUN npm run server:build

FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    AUTO_SIGN_PORT=3001 \
    PDFJS_WORKER_SRC=/app/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist-server ./dist-server

# node:20-slim already ships a non-root `node` user (UID 1000)
RUN chown -R node:node /app
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "dist-server/index.js"]
