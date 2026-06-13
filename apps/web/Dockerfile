# ============================================================
# LedgerFlow Web — Vue 3 / Vite Dockerfile
# ============================================================

FROM node:22-alpine AS base

WORKDIR /usr/src/app/apps/web

COPY apps/web/package*.json ./

# ============================================================
# Development
# ============================================================

FROM base AS development

ENV NODE_ENV=development

RUN npm install

COPY apps/web ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ============================================================
# Build
# ============================================================

FROM base AS build

ENV NODE_ENV=production

RUN npm ci

COPY apps/web ./

RUN npm run build


# ============================================================
# Production with Nginx
# ============================================================

FROM nginx:1.27-alpine AS production

COPY --from=build /usr/src/app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
