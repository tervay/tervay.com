FROM oven/bun:1.4.3-alpine
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/artifacts/package.json apps/artifacts/
RUN bun install --frozen-lockfile --production --filter artifacts
COPY apps/artifacts apps/artifacts
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
EXPOSE 3000
WORKDIR /app/apps/artifacts
CMD ["bun", "src/index.ts"]
