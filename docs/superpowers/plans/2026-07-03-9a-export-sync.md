# 9A Export and Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 9A.7 with reconciliation CSV exports via streams and controlled provider settlement sync that does not duplicate webhook-created facts.

**Architecture:** Extend the existing async `ExportJob` pipeline with `RECONCILIATION_CASES`, preserving CSV-only behavior and temporary storage/audit. Add a reconciliation sync service that uses provider adapters, applies page limits/rate-limit jitter/circuit-breaker behavior, and writes settlements through the same idempotent ingestion path used by webhooks.

**Tech Stack:** NestJS, Prisma, Jest, Node.js streams, existing ExportJob service, existing reconciliation adapters and async/outbox infrastructure.

---

### Task 1: Reconciliation Case CSV Export

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260703233000_add_reconciliation_case_export_type/migration.sql`
- Modify: `apps/api/src/modules/exports/application/services/export-jobs.service.ts`
- Test: `apps/api/src/modules/exports/application/services/export-jobs.service.spec.ts`

- [x] **Step 1: Write failing export test**
  Assert `ExportJobType.RECONCILIATION_CASES` streams cases with tenant/date/status filters, writes CSV headers and rows, and preserves IDs as spreadsheet text.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- export-jobs.service.spec.ts --runInBand`
  Expected: FAIL because enum/export branch is missing.

- [x] **Step 3: Add enum value and migration**
  Add `RECONCILIATION_CASES` to `ExportJobType` and migration SQL.

- [x] **Step 4: Implement stream branch**
  Add reconciliation CSV headers, cursor pagination over `reconciliationCase.findMany`, filter builder, and row serialization from case snapshots only.

- [x] **Step 5: Run GREEN**
  Run: `cd apps/api && npx prisma generate && npm test -- export-jobs.service.spec.ts --runInBand`
  Expected: PASS.

### Task 2: Idempotent Settlement Sync

**Files:**
- Modify: `apps/api/src/modules/reconciliation/application/services/reconciliation-settlement-ingestion.service.ts`
- Create: `apps/api/src/modules/reconciliation/application/services/reconciliation-sync.service.ts`
- Test: `apps/api/src/modules/reconciliation/application/services/reconciliation-sync.service.spec.ts`

- [x] **Step 1: Write failing sync tests**
  Assert sync fetches provider pages, ingests each normalized settlement through the idempotent ingestion path, schedules next page with jitter, stops on unsupported provider, and opens circuit after repeated provider failures.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-sync.service.spec.ts --runInBand`
  Expected: FAIL because sync service/public ingestion method is missing.

- [x] **Step 3: Extract normalized ingestion method**
  Add `ingestNormalizedSettlement(tenantId, normalized, sourceWebhookInboxEventId?)` so webhook and sync use one upsert/outbox implementation.

- [x] **Step 4: Implement sync control**
  Add page limit, per-page rate-limit delay with deterministic jitter function, circuit-open result after configured failures, and audit/outbox summaries.

- [x] **Step 5: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-sync.service.spec.ts reconciliation-settlement-ingestion.service.spec.ts --runInBand`
  Expected: PASS.

### Task 3: API Wiring

**Files:**
- Create: `apps/api/src/modules/reconciliation/application/dto/reconciliation-sync-request.dto.ts`
- Create: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-sync.controller.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Test: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-sync.controller.spec.ts`

- [x] **Step 1: Write failing controller metadata tests**
  Assert `POST /reconciliation/sync/asaas` requires `reconciliation:sync` and `ReconciliationCapabilities.Sync`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-sync.controller.spec.ts --runInBand`
  Expected: FAIL because controller does not exist.

- [x] **Step 3: Add controller and module providers**
  Wire sync service and Asaas adapter. The controller triggers controlled sync and returns summary only.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-sync.controller.spec.ts --runInBand`
  Expected: PASS.

### Task 4: Validation

**Files:**
- All touched API files and plan file.

- [x] **Step 1: Run focused API tests**
  Run export jobs, sync, ingestion, matching, cases, dashboard, policies, decisions.

- [x] **Step 2: Run Prisma validation and API build**
  Run `DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate` and `npm run build`.

- [x] **Step 3: Review git status**
  Run `git status --short --branch --untracked-files=all` and `git diff --check`.
