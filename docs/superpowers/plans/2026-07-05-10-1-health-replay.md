# 10.1 Mercado Livre Health and Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 10.1.7 by exposing sanitized channel health plus technical replay controls for webhook inbox and inventory sync failures.

**Architecture:** Keep health/replay inside Channels as an operational application service. Health aggregates integration status, inbox failures, and inventory sync failures without returning credentials or raw provider payloads. Replay does not reprocess inline: it restores safe state and emits the same outbox event used by existing workers.

**Tech Stack:** NestJS, Prisma, Jest, existing Channels repository/service/controller, Outbox pattern.

---

### Task 1: Health and Replay Service

**Files:**
- Modify: `apps/api/src/modules/channels/domain/repositories/channels.repository.ts`
- Modify: `apps/api/src/modules/channels/infra/repositories/prisma-channels.repository.ts`
- Create: `apps/api/src/modules/channels/application/services/channel-health-replay.service.ts`
- Create: `apps/api/src/modules/channels/application/services/channel-health-replay.service.spec.ts`

- [x] **Step 1: Write failing service tests**

Assert health summary is tenant-scoped and sanitized, webhook replay emits `channel.webhook.received`, and inventory sync replay moves failed/circuit-open state back to `PENDING`.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- channel-health-replay.service.spec.ts --runInBand`
Expected: FAIL because the service does not exist.

- [x] **Step 3: Implement minimal service and repository methods**

Add health aggregation, replay repository methods, outbox emission, audit log entries, and validation that replay only targets tenant-owned failed/circuit states.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- channel-health-replay.service.spec.ts --runInBand`
Expected: PASS.

### Task 2: Controller Surface

**Files:**
- Modify: `apps/api/src/modules/channels/application/dto/channel-response.dto.ts`
- Modify: `apps/api/src/modules/channels/presentation/controllers/channels.controller.ts`
- Modify: `apps/api/src/modules/channels/channels.module.ts`
- Create: `apps/api/src/modules/channels/presentation/controllers/channels-controller-health-replay.spec.ts`

- [x] **Step 1: Write failing controller tests**

Assert `GET /channels/health`, `POST /channels/webhook-inbox/:id/replay`, and `POST /channels/inventory-sync/:id/replay` delegate to the service with current tenant/user and required manage/read posture.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- channels-controller-health-replay.spec.ts --runInBand`
Expected: FAIL because controller methods are missing.

- [x] **Step 3: Implement controller and module wiring**

Add DTOs, inject `ChannelHealthReplayService`, wire provider, and expose endpoints using existing Channels permissions/capabilities.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- channels-controller-health-replay.spec.ts channel-health-replay.service.spec.ts --runInBand`
Expected: PASS.

### Task 3: Verification

**Files:**
- No additional files.

- [x] **Step 1: Run focused tests**

Run: `cd apps/api && npm test -- channel-health-replay.service.spec.ts channels-controller-health-replay.spec.ts channel-webhook-intake.service.spec.ts channel-inventory-sync.service.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma and build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
