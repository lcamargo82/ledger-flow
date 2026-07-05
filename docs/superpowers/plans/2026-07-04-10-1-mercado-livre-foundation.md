# 10.1 Mercado Livre Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start Sprint 10.1.1 by importing the Mercado Livre documentation package and adding the tenant-scoped channel connection foundation without OAuth/API/webhook behavior.

**Architecture:** Reuse the existing `channels` module from 10.0 and evolve `ChannelIntegration` as the tenant-owned operational source of truth. Keep provider-specific behavior behind an adapter contract and ensure `.env` is restricted to global application infrastructure, never tenant/store tokens.

**Tech Stack:** NestJS, Prisma, Jest, Swagger DTOs, class-validator, Vue/i18n docs.

---

### Task 1: Documentation Import

**Files:**
- Add: `docs/prd/10.1-mercado-livre-adapter-prd.md`
- Add: `docs/sdd/10.1-mercado-livre-adapter-sdd.md`
- Add: `docs/specs/10.1-mercado-livre-components-i18n.md`
- Add: `docs/specs/10.1-mercado-livre-sprint-plan.md`
- Add: `docs/backlog/10.1-mercado-livre-backlog.md`
- Add: `docs/adr/0035-mercado-livre-adapter-and-connection-boundaries.md`
- Modify: `docs/README.md`

- [x] **Step 1: Import package docs**

Copy the supplied PRD, SDD, specs, backlog, and ADR into their matching `docs/` subfolders.

- [x] **Step 2: Merge README**

Add the 10.1 index and the central rule that tenant/store integrations are configured by panel, not operational `.env` secrets.

### Task 2: Tenant-Scoped ChannelIntegration Foundation

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Add: `apps/api/prisma/migrations/20260704010100_harden_channel_integrations_for_10_1/migration.sql`
- Modify: `apps/api/src/modules/channels/domain/repositories/channels.repository.ts`
- Modify: `apps/api/src/modules/channels/infra/repositories/prisma-channels.repository.ts`
- Modify: `apps/api/src/modules/channels/application/dto/create-channel-integration.dto.ts`
- Modify: `apps/api/src/modules/channels/application/dto/channel-response.dto.ts`
- Add: `apps/api/src/modules/channels/application/services/channels.service.spec.ts`
- Modify: `apps/api/src/modules/channels/application/services/channels.service.ts`

- [x] **Step 1: Write failing tests**

Assert a panel-created Mercado Livre integration persists tenant-scoped operational fields without secrets in `settingsJson`, and rejects tenant/store token fields in settings.

- [x] **Step 2: Run tests to verify RED**

Run: `cd apps/api && npm test -- channels.service.spec.ts --runInBand`
Expected: FAIL because the DTO/service/schema do not yet support the new safe operational fields.

- [x] **Step 3: Implement schema and service support**

Add statuses `INACTIVE`, `SUSPENDED`, `REAUTH_REQUIRED`; add `externalAccountId`, `displayName`, `encryptedCredentials`, `credentialsVersion`, `credentialsFingerprint`, `settingsJson`, `defaultWarehouseId`, `syncPolicyJson`, `healthStatus`, `lastSuccessfulOperationAt`, and `lastFailureAt` to `ChannelIntegration`. Update DTOs/repository/service and sanitize metadata/audit.

- [x] **Step 4: Run tests to verify GREEN**

Run: `cd apps/api && npm test -- channels.service.spec.ts --runInBand`
Expected: PASS.

### Task 3: Adapter Contract

**Files:**
- Add: `apps/api/src/modules/channels/domain/interfaces/channel-provider-adapter.interface.ts`
- Add: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.ts`
- Add: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.spec.ts`

- [x] **Step 1: Write failing adapter test**

Assert the Mercado Livre adapter exposes provider metadata and has no direct Inventory/Orders repository dependencies.

- [x] **Step 2: Implement minimal adapter contract**

Create a provider-agnostic adapter interface and a Mercado Livre stub that only declares capabilities for future OAuth/listings/webhook/sync phases.

- [x] **Step 3: Run adapter test**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts --runInBand`
Expected: PASS.

### Task 4: Verification

**Files:**
- No additional files.

- [x] **Step 1: Run focused tests**

Run: `cd apps/api && npm test -- channels.service.spec.ts mercado-livre-channel.adapter.spec.ts channel-listings.service.spec.ts channel-webhook-intake.service.spec.ts channel-inventory-sync.service.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma/build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
