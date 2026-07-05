# 10.1 Mercado Livre Real Inventory Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 10.1.6 by sending desired stock state to Mercado Livre listings with coalescing, retry/backoff, Retry-After handling, and circuit protection.

**Architecture:** Reuse the existing `ChannelInventorySyncService` and `ChannelInventorySyncState` coalescing model. Add a provider adapter method for stock updates, decrypt tenant credentials only in backend service code, verify the integration is still syncable before each provider call, and persist only sanitized technical failure data.

**Tech Stack:** NestJS, Prisma, Jest, existing ChannelsRepository, Mercado Livre adapter/client, GatewayCredentialsEncryptionService.

---

### Task 1: Mercado Livre Stock Update Adapter

**Files:**
- Modify: `apps/api/src/modules/channels/domain/interfaces/channel-provider-adapter.interface.ts`
- Modify: `apps/api/src/modules/channels/infra/clients/mercado-livre-api.client.ts`
- Modify: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.ts`
- Modify: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.spec.ts`

- [x] **Step 1: Write failing adapter test**

Assert `MercadoLivreChannelAdapter.updateListingStock()` calls the API client with `accessToken`, `externalListingId`, and desired `availableQuantity`, and returns a sanitized result.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts --runInBand`
Expected: FAIL because stock update is not implemented.

- [x] **Step 3: Implement adapter/client stock update**

Add `ChannelInventorySyncAdapter`, `updateListingStock()`, and a Mercado Livre client method that sends `PUT /items/{id}` with `available_quantity`.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts --runInBand`
Expected: PASS.

### Task 2: Real Sync Processing

**Files:**
- Modify: `apps/api/src/modules/channels/application/services/channel-inventory-sync.service.ts`
- Modify: `apps/api/src/modules/channels/application/services/channel-inventory-sync.service.spec.ts`

- [x] **Step 1: Write failing service tests**

Assert pending Mercado Livre sync decrypts credentials, calls the adapter with desired quantity, marks success, schedules retry from provider 429/Retry-After, and blocks provider calls when the integration is disabled, suspended, or reauth-required.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- channel-inventory-sync.service.spec.ts --runInBand`
Expected: FAIL because real Mercado Livre sync still returns provider-not-supported.

- [x] **Step 3: Implement real processing**

Inject MercadoLivreChannelAdapter and GatewayCredentialsEncryptionService, resolve the integration before processing each pending state, call the adapter for Mercado Livre, preserve MOCK behavior, and keep error summaries sanitized.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- channel-inventory-sync.service.spec.ts --runInBand`
Expected: PASS.

### Task 3: Verification

**Files:**
- No additional files.

- [x] **Step 1: Run focused tests**

Run: `cd apps/api && npm test -- channel-inventory-sync.service.spec.ts mercado-livre-channel.adapter.spec.ts channel-listings.service.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma and build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
