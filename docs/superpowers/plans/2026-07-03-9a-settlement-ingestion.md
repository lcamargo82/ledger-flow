# 9A Settlement Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 9A.2 by adding ProviderSettlementEvent persistence, Asaas settlement normalization, idempotent webhook-based ingestion, and outbox emission for `reconciliation.settlement_received`.

**Architecture:** Reuse the existing `WebhookInboxEvent` as the technical input record and create a separate `ProviderSettlementEvent` as the normalized financial fact. The Asaas payment webhook worker remains the entry point; after payment sync it invokes reconciliation ingestion, which upserts by `provider + providerEventId` and emits an outbox event only for newly created settlement facts.

**Tech Stack:** NestJS, Prisma, Jest, existing 8A Outbox/RabbitMQ infrastructure, Prisma Decimal for precise amount parsing.

---

### Task 1: Money and Asaas Normalization

**Files:**
- Create: `apps/api/src/modules/reconciliation/domain/value-objects/money.ts`
- Create: `apps/api/src/modules/reconciliation/domain/interfaces/reconciliation-provider-adapter.interface.ts`
- Create: `apps/api/src/modules/reconciliation/infra/adapters/asaas-reconciliation-provider.adapter.ts`
- Test: `apps/api/src/modules/reconciliation/infra/adapters/asaas-reconciliation-provider.adapter.spec.ts`

- [x] **Step 1: Write failing adapter tests**
  Assert Asaas decimal `123.45` becomes `12345` minor units, preserves provider/event/payment/reference/status fields, sanitizes normalized payload, and returns null when the webhook has no amount and no provider payment/reference.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- asaas-reconciliation-provider.adapter.spec.ts --runInBand`
  Expected: FAIL because adapter and Money value object do not exist.

- [x] **Step 3: Implement Money and adapter**
  Add `Money.fromDecimalString(value, currency)` using Prisma Decimal and exponent map for BRL/USD/JPY. Add Asaas adapter that accepts the existing `NormalizedWebhookEvent` shape.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- asaas-reconciliation-provider.adapter.spec.ts --runInBand`
  Expected: PASS.

### Task 2: ProviderSettlementEvent Persistence and Ingestion Service

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260703190000_add_provider_settlement_events/migration.sql`
- Create: `apps/api/src/modules/reconciliation/application/services/reconciliation-settlement-ingestion.service.ts`
- Test: `apps/api/src/modules/reconciliation/application/services/reconciliation-settlement-ingestion.service.spec.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`

- [x] **Step 1: Write failing service tests**
  Assert first ingest creates ProviderSettlementEvent and outbox event, duplicate ingest returns existing without another outbox event, and orphaned events are stored without creating a tenant-scoped case.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-settlement-ingestion.service.spec.ts --runInBand`
  Expected: FAIL because service and Prisma model do not exist.

- [x] **Step 3: Add Prisma model and migration**
  Add `ProviderSettlementEvent` with optional `tenantId`, optional `sourceWebhookInboxEventId`, unique `[provider, providerEventId]`, and indexes from the SDD. Use `Decimal(18,0)` for minor-unit amounts to avoid BigInt serialization friction in API/outbox payloads.

- [x] **Step 4: Implement service**
  Use a transaction: find existing settlement by provider/providerEventId; create settlement and outbox if missing; return `{ settlementEvent, created }`.

- [x] **Step 5: Generate Prisma client**
  Run: `cd apps/api && npx prisma generate`
  Expected: client generation succeeds.

- [x] **Step 6: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-settlement-ingestion.service.spec.ts --runInBand`
  Expected: PASS.

### Task 3: Webhook Worker Integration

**Files:**
- Modify: `apps/api/src/modules/webhooks/application/async-handlers/asaas-webhook-processing.handler.ts`
- Modify: `apps/api/src/modules/webhooks/webhooks.module.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Test: `apps/api/src/modules/webhooks/application/async-handlers/asaas-webhook-processing.handler.spec.ts`

- [x] **Step 1: Write failing handler test**
  Assert the Asaas webhook handler calls reconciliation ingestion with the processed inbox event after the payment processor runs.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- asaas-webhook-processing.handler.spec.ts --runInBand`
  Expected: FAIL because the handler does not depend on reconciliation ingestion yet.

- [x] **Step 3: Wire service into handler**
  Import `ReconciliationModule` into `WebhooksModule`, export ingestion service from `ReconciliationModule`, and call `ingestAsaasWebhookInbox(inboxEvent)` after payment processing.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- asaas-webhook-processing.handler.spec.ts --runInBand`
  Expected: PASS.

### Task 4: Validation

**Files:**
- All touched API files and plan file.

- [x] **Step 1: Run focused reconciliation tests**
  Run adapter, ingestion, handler, and foundation tests.

- [x] **Step 2: Run API build**
  Run: `cd apps/api && npm run build`
  Expected: PASS.

- [x] **Step 3: Review git status**
  Run: `git status --short --branch`
  Expected: current branch is `feature/9a-2-settlement-ingestion` with only 9A.1 carried changes plus 9A.2 implementation changes.
