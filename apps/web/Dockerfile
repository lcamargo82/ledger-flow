# ============================================================
# LedgerFlow Web — Vue 3 / Vite Dockerfile
# ============================================================

FROM node:24-alpine AS base

WORKDIR /usr/src/app/apps/web

COPY apps/web/package*.json ./

# ============================================================
# Development
# ============================================================

FROM base AS development

ENV NODE_ENV=development
ENV CYPRESS_INSTALL_BINARY=0

RUN npm install --ignore-scripts

COPY apps/web ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ============================================================
# Build
# ============================================================

FROM base AS build

ENV NODE_ENV=production
ENV CYPRESS_INSTALL_BINARY=0

ARG VITE_APP_NAME=LedgerFlow
ARG VITE_APP_ENV=production
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_DEFAULT_LOCALE=pt-BR
ARG VITE_DEFAULT_TIMEZONE=America/Sao_Paulo
ARG VITE_NOTIFICATIONS_POLLING_INTERVAL_MS=30000

ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_ENV=${VITE_APP_ENV}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL=${VITE_WS_BASE_URL}
ENV VITE_DEFAULT_LOCALE=${VITE_DEFAULT_LOCALE}
ENV VITE_DEFAULT_TIMEZONE=${VITE_DEFAULT_TIMEZONE}
ENV VITE_NOTIFICATIONS_POLLING_INTERVAL_MS=${VITE_NOTIFICATIONS_POLLING_INTERVAL_MS}

RUN npm ci --include=dev --ignore-scripts

COPY apps/web ./

RUN npm run build


# ============================================================
# Production with Nginx
# ============================================================

FROM nginx:1.27-alpine AS production

COPY --from=build /usr/src/app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
