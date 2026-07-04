# 10.1 Listing Import Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 10.1.3 by importing real Mercado Livre listings through the channel adapter, paginating provider data, matching by canonical SKU, and preserving the existing manual mapping workflow.

**Architecture:** Reuse `ChannelsService.importListings` as the tenant-scoped entry point. Keep MOCK import behavior for local/demo flows, and route Mercado Livre imports through `MercadoLivreChannelAdapter`, which fetches/sanitizes external listings and returns provider-agnostic listing inputs.

**Tech Stack:** NestJS, Prisma, Jest, existing channels repository, existing central encrypted credentials, Mercado Livre API client.

---

### Task 1: Mercado Livre Listing Adapter

**Files:**
- Modify: `apps/api/src/modules/channels/domain/interfaces/channel-provider-adapter.interface.ts`
- Modify: `apps/api/src/modules/channels/infra/clients/mercado-livre-api.client.ts`
- Modify: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.ts`
- Modify: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.spec.ts`

- [x] **Step 1: Write failing adapter test**

Assert `fetchListings` paginates Mercado Livre items, fetches details, maps `externalListingId`, `title`, `externalSku`, and does not leak raw provider payload.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts --runInBand`
Expected: FAIL because listing import is not implemented.

- [x] **Step 3: Implement adapter/client methods**

Add `fetchListings(input)` to the channel adapter contract, `searchSellerItems` and `getItem` to the Mercado Livre API client, and sanitized mapping in `MercadoLivreChannelAdapter`.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts --runInBand`
Expected: PASS.

### Task 2: Service Import Flow

**Files:**
- Modify: `apps/api/src/modules/channels/application/services/channels.service.ts`
- Modify: `apps/api/src/modules/channels/application/services/channel-listings.service.spec.ts`
- Modify: `apps/api/src/modules/channels/channels.module.ts`

- [x] **Step 1: Write failing service test**

Assert an ACTIVE Mercado Livre integration with encrypted credentials imports provider listings via adapter, classifies by SKU, upserts idempotently, and records sanitized audit/outbox summaries.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- channel-listings.service.spec.ts --runInBand`
Expected: FAIL because the service currently rejects non-MOCK imports.

- [x] **Step 3: Implement service import routing**

Inject `MercadoLivreChannelAdapter` and central `GatewayCredentialsEncryptionService`; decrypt credentials only in memory; call adapter; classify returned listing DTOs; keep MOCK behavior unchanged.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- channel-listings.service.spec.ts --runInBand`
Expected: PASS.

### Task 3: Verification

**Files:**
- No additional files.

- [x] **Step 1: Run focused tests**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts channel-listings.service.spec.ts channels.service.spec.ts mercado-livre-oauth.service.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma/build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
