# ============================================================
# LedgerFlow API — NestJS Dockerfile
# ============================================================

FROM node:22-alpine AS base

WORKDIR /usr/src/app/apps/api

RUN apk add --no-cache openssl libc6-compat

COPY apps/api/package*.json ./

# ============================================================
# Development
# ============================================================

FROM base AS development

ENV NODE_ENV=development

RUN npm install

COPY apps/api ./

EXPOSE 3000

CMD ["npm", "run", "start:dev"]


# ============================================================
# Build
# ============================================================

FROM base AS build

ENV NODE_ENV=production

RUN npm ci --include=dev

COPY apps/api ./

RUN npm run prisma:generate && npm run build


# ============================================================
# Production dependencies
# ============================================================

FROM build AS production-deps

RUN npm prune --omit=dev


# ============================================================
# Production
# ============================================================

FROM node:22-alpine AS production

WORKDIR /usr/src/app/apps/api

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY apps/api/package*.json ./
COPY --from=production-deps /usr/src/app/apps/api/node_modules ./node_modules
COPY --from=build /usr/src/app/apps/api/dist ./dist
COPY --from=build /usr/src/app/apps/api/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
