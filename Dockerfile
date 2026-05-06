# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy everything (source + manifests + lock file)
COPY . .

# Install all deps (including devDeps needed to build)
RUN npm ci

# 1. Compile shared TypeScript → dist/
RUN npm run build --workspace=shared

# 2. Patch shared/package.json so Node.js resolves the compiled JS at runtime
RUN node -e "\
  const fs = require('fs');\
  const p = JSON.parse(fs.readFileSync('shared/package.json'));\
  p.main = './dist/index.js';\
  p.exports = { '.': './dist/index.js' };\
  fs.writeFileSync('shared/package.json', JSON.stringify(p, null, 2));\
"

# 3. Build client bundle (Vite → client/dist/)
RUN npm run build --workspace=client

# 4. Compile server TypeScript → server/dist/
RUN npm run build --workspace=server

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy manifests needed for workspace symlink resolution
COPY --from=builder /app/package.json        ./package.json
COPY --from=builder /app/package-lock.json   ./package-lock.json
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/client/package.json ./client/package.json

# Install only production dependencies (creates workspace symlinks)
RUN npm ci --omit=dev

# Copy compiled artifacts
COPY --from=builder /app/shared/dist   ./shared/dist
COPY --from=builder /app/server/dist   ./server/dist
COPY --from=builder /app/client/dist   ./client/dist

EXPOSE 3001
CMD ["node", "server/dist/main.js"]
