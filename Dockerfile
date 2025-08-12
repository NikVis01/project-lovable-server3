# syntax=docker/dockerfile:1.7

##############################
# Base (Bun + workspaces deps)
##############################
FROM oven/bun:1.2.20 AS base
WORKDIR /app

# Monorepo manifests
COPY package.json bun.lock bunfig.toml ./
# Workspace manifests (speeds up install layer)
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

# Install workspace deps (frozen) once for both apps
RUN bun install --frozen-lockfile

##############################
# Server build
##############################
FROM base AS server-build
WORKDIR /app

# Copy server sources
COPY apps/server/ apps/server/

# Generate Prisma client and build TS → dist
RUN cd apps/server \
 && bunx prisma generate \
 && bun run build

##############################
# Web build
##############################
FROM base AS web-build
WORKDIR /app

# Build args for public envs
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

# Copy web sources
COPY apps/web/ apps/web/

# Build Next.js app
RUN cd apps/web \
 && bun run build

##############################
# Server runtime image
##############################
FROM oven/bun:1.2.20 AS server
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Reuse installed deps from base
COPY --from=base /app/node_modules ./node_modules

# Copy built server dist and required runtime assets
COPY --from=server-build /app/apps/server/dist ./apps/server/dist
COPY --from=server-build /app/apps/server/package.json ./apps/server/package.json
# Prisma generated client + schema (for migrations/generate if needed)
COPY --from=server-build /app/apps/server/prisma/generated ./apps/server/prisma/generated
COPY --from=server-build /app/apps/server/prisma/schema ./apps/server/prisma/schema

EXPOSE 3000
# Run compiled server
CMD ["bun", "run", "apps/server/dist/index.js"]

##############################
# Web runtime image
##############################
FROM node:20-alpine AS web
WORKDIR /app/apps/web
ENV NODE_ENV=production \
    PORT=3001 \
    NEXT_TELEMETRY_DISABLED=1

# Reuse deps (workspace root deps)
COPY --from=base /app/node_modules /app/node_modules

# Copy built Next output and minimal project files
COPY --from=web-build /app/apps/web/.next ./.next
COPY --from=web-build /app/apps/web/package.json ./package.json
COPY --from=web-build /app/apps/web/next.config.ts ./next.config.ts
# Public/static (if present)
COPY --from=web-build /app/apps/web/public ./public

EXPOSE 3001
# Start Next.js
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "3001"]

############################################
# Build examples
#   Server image: docker build -t proj-server --target server .
#   Web image:    docker build -t proj-web --target web \
#                   --build-arg NEXT_PUBLIC_SERVER_URL=http://localhost:3000 .
############################################ 