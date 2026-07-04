# 10.1 OAuth Token Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 10.1.2 with secure Mercado Livre OAuth initiation, callback, encrypted tenant-scoped credentials, and disconnect endpoints.

**Architecture:** Keep global Mercado Livre app credentials in env and tenant/store credentials only in `ChannelIntegration.encryptedCredentials`. Reuse the central gateway credentials encryption service and create channels-owned OAuth state/client/services so the channel domain does not depend on payment gateway repositories.

**Tech Stack:** NestJS, Prisma, Jest, ioredis-compatible state abstraction, Swagger decorators, existing RBAC/capability guards.

---

### Task 1: OAuth State and Token Exchange Service

**Files:**
- Add: `apps/api/src/modules/channels/application/services/mercado-livre-oauth-state.service.ts`
- Add: `apps/api/src/modules/channels/application/services/mercado-livre-oauth.service.ts`
- Add: `apps/api/src/modules/channels/application/services/mercado-livre-oauth.service.spec.ts`
- Add: `apps/api/src/modules/channels/infra/clients/mercado-livre-api.client.ts`
- Modify: `apps/api/src/modules/channels/channels.module.ts`

- [x] **Step 1: Write failing OAuth service tests**

Assert `generateAuthorizationUrl` creates a state-bound URL without leaking tokens, and `handleCallback` consumes state, exchanges code, encrypts credentials, round-trips decrypt, persists `ChannelIntegration` as `ACTIVE`, and writes sanitized audit metadata.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- mercado-livre-oauth.service.spec.ts --runInBand`
Expected: FAIL because services do not exist.

- [x] **Step 3: Implement service/client/state**

Create a Redis-backed state service with injectable in-memory behavior for tests, a minimal API client interface for token exchange, and OAuth service using global env for app credentials only.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- mercado-livre-oauth.service.spec.ts --runInBand`
Expected: PASS.

### Task 2: Controller Contract

**Files:**
- Add: `apps/api/src/modules/channels/presentation/controllers/mercado-livre-oauth.controller.ts`
- Add: `apps/api/src/modules/channels/presentation/controllers/mercado-livre-oauth.controller.spec.ts`
- Add: `apps/api/src/modules/channels/application/dto/mercado-livre-oauth-response.dto.ts`
- Modify: `apps/api/src/modules/channels/channels.module.ts`

- [x] **Step 1: Write failing controller test**

Assert `POST /channels/mercado-livre/connect` requires `channels:manage` plus `channels.connect`, callback has no token response body, and disconnect requires manage capability.

- [x] **Step 2: Implement controller and DTOs**

Add connect/callback/disconnect endpoints with sanitized responses and no token/code echo.

- [x] **Step 3: Run controller test**

Run: `cd apps/api && npm test -- mercado-livre-oauth.controller.spec.ts --runInBand`
Expected: PASS.

### Task 3: Verification

**Files:**
- No additional files.

- [x] **Step 1: Run focused tests**

Run: `cd apps/api && npm test -- mercado-livre-oauth.service.spec.ts mercado-livre-oauth.controller.spec.ts channels.service.spec.ts mercado-livre-channel.adapter.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma/build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
