# 10.1 Mercado Livre Webhooks Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 10.1.4 by accepting real Mercado Livre notifications into a tenant-scoped Inbox/Outbox flow without doing order or inventory effects synchronously.

**Architecture:** Keep the existing generic channel webhook intake for MOCK/secret-based flows. Add Mercado Livre notification normalization that resolves tenant/integration by `provider + user_id` (`ChannelIntegration.externalAccountId`), stores only sanitized metadata, and emits one outbox event per unique provider notification/resource.

**Tech Stack:** NestJS, Prisma, Jest, existing Channels repository/service/controller, Outbox pattern.

---

### Task 1: Mercado Livre Notification Intake

**Files:**
- Modify: `apps/api/src/modules/channels/domain/repositories/channels.repository.ts`
- Modify: `apps/api/src/modules/channels/infra/repositories/prisma-channels.repository.ts`
- Modify: `apps/api/src/modules/channels/application/services/channel-webhook-intake.service.ts`
- Modify: `apps/api/src/modules/channels/application/services/channel-webhook-intake.service.spec.ts`

- [x] **Step 1: Write failing tests**

Assert a Mercado Livre payload with `topic`, `resource`, `user_id`, `application_id`, `attempts`, `sent`, and `received` resolves the active integration by `externalAccountId`, creates a sanitized inbox event, emits `channel.webhook.received`, and does not store raw payload fields.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- channel-webhook-intake.service.spec.ts --runInBand`
Expected: FAIL because Mercado Livre payload normalization/resolution is not implemented.

- [x] **Step 3: Implement repository lookup and normalization**

Add `findActiveIntegrationByExternalAccountId`, deterministic provider event id from notification identity, sanitized summary fields, duplicate protection, and no secret requirement for Mercado Livre.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- channel-webhook-intake.service.spec.ts --runInBand`
Expected: PASS.

### Task 2: Public Controller Path

**Files:**
- Modify: `apps/api/src/modules/channels/presentation/controllers/channel-webhooks.controller.ts`
- Add/Modify tests if needed: `apps/api/src/modules/channels/presentation/controllers/channel-webhooks.controller.spec.ts`

- [x] **Step 1: Support official-friendly path**

Accept `/webhooks/channels/mercado-livre` as `ChannelProvider.MERCADO_LIVRE` while keeping enum provider paths working.

- [x] **Step 2: Verify controller metadata and behavior**

Run focused controller/intake tests.

### Task 3: Verification

**Files:**
- No additional files.

- [x] **Step 1: Run focused tests**

Run: `cd apps/api && npm test -- channel-webhook-intake.service.spec.ts channel-listings.service.spec.ts mercado-livre-oauth.service.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma/build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
