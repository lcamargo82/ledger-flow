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

RUN npm ci

COPY apps/api ./

RUN npm run build


# ============================================================
# Production
# ============================================================

FROM node:22-alpine AS production

WORKDIR /usr/src/app/apps/api

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY apps/api/package*.json ./

RUN npm ci --omit=dev

COPY --from=build /usr/src/app/apps/api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
