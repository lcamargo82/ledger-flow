# 9A Hardening Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Sprint 9A.8 with operational hardening evidence for replay idempotency, worker resilience, LGPD-safe normalized payloads, OpenAPI/AsyncAPI coverage, and an operational checklist.

**Architecture:** Keep 9A.8 small and verifiable. Avoid new reconciliation domain behavior; add focused tests and documentation around the already delivered ingestion, matching, sync, export, audit, and async contracts.

**Tech Stack:** NestJS, Prisma, Jest, Swagger decorators, AsyncAPI YAML, Markdown runbooks.

---

### Task 1: LGPD Sanitization Evidence

**Files:**
- Modify: `apps/api/src/modules/reconciliation/infra/adapters/asaas-reconciliation-provider.adapter.spec.ts`
- Modify: `apps/api/src/modules/reconciliation/infra/adapters/asaas-reconciliation-provider.adapter.ts`

- [x] **Step 1: Write the failing test**

Add a test proving sensitive provider payload fields are not copied into `normalizedPayload`, while the payload records which fields were redacted.

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- asaas-reconciliation-provider.adapter.spec.ts --runInBand`
Expected: FAIL because `redactedFields` is not reported yet.

- [x] **Step 3: Implement minimal sanitizer change**

Keep the allowlist for normalized payload fields and add `redactedFields` when keys such as `customer`, `billingAddress`, `creditCard`, `token`, `accessToken`, `authorization`, `webhookSecret`, or `apiKey` are present in the provider payload summary.

- [x] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npm test -- asaas-reconciliation-provider.adapter.spec.ts --runInBand`
Expected: PASS.

### Task 2: OpenAPI Sync Contract Hardening

**Files:**
- Create: `apps/api/src/modules/reconciliation/application/dto/reconciliation-sync-response.dto.ts`
- Modify: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-sync.controller.spec.ts`
- Modify: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-sync.controller.ts`

- [x] **Step 1: Write the failing test**

Assert `POST /reconciliation/sync/asaas` exposes an `ApiOkResponse` type for the sync summary DTO and keeps `reconciliation:sync` plus `ReconciliationCapabilities.Sync`.

- [x] **Step 2: Run test to verify it fails**

Run: `cd apps/api && npm test -- reconciliation-sync.controller.spec.ts --runInBand`
Expected: FAIL because the controller currently documents the success response only with a description.

- [x] **Step 3: Implement response DTO and decorator**

Add `ReconciliationSyncResponseDto` with provider, pagesFetched, received, created, duplicates, circuitOpened, and nextAttemptAt fields. Update `@ApiOkResponse` to use this DTO.

- [x] **Step 4: Run test to verify it passes**

Run: `cd apps/api && npm test -- reconciliation-sync.controller.spec.ts --runInBand`
Expected: PASS.

### Task 3: AsyncAPI and Operational Runbook

**Files:**
- Modify: `docs/asyncapi.yaml`
- Add: `docs/runbooks/9A-reconciliation-operational-readiness.md`
- Modify: `docs/README.md`
- Modify: `docs/specs/9A-reconciliation-sprint-plan.md`
- Modify: `docs/backlog/9A-reconciliation-backlog.md`

- [x] **Step 1: Update AsyncAPI**

Document `reconciliation.sync.completed` and its payload.

- [x] **Step 2: Add runbook/checklist**

Document replay idempotency, worker resilience, export CSV constraints, sync circuit breaker, LGPD data handling, OpenAPI/AsyncAPI references, metrics to monitor, and operational go/no-go checklist.

- [x] **Step 3: Mark sprint docs**

Update 9A sprint plan/backlog to point to the runbook and mark 9A.8 closure criteria.

### Task 4: Final Verification

**Files:**
- No production files beyond tasks above.

- [x] **Step 1: Run focused reconciliation tests**

Run: `cd apps/api && npm test -- asaas-reconciliation-provider.adapter.spec.ts reconciliation-sync.controller.spec.ts reconciliation-settlement-received.handler.spec.ts reconciliation-settlement-ingestion.service.spec.ts reconciliation-sync.service.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma and build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
