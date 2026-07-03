# 9A Manual Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 9A.4 with append-only reconciliation decisions, manual case actions, timeline/audit, and a reusable review modal in the web app.

**Architecture:** Persist every manual action in immutable `ReconciliationDecision` rows and update `ReconciliationCase` only inside the same transaction. The API remains tenant-scoped and guarded by `reconciliation.manage`; timeline responses merge decision history with the current case context. The web shell consumes the case APIs and opens one reusable modal for manual match, resolve exception, ignore, reopen, and comments.

**Tech Stack:** NestJS, Prisma, Jest, Swagger DTOs, Vue 3, Pinia, Vitest, existing capability guards and common modal/button components.

---

### Task 1: Decision Model and Service

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260703213000_add_reconciliation_decisions/migration.sql`
- Create: `apps/api/src/modules/reconciliation/application/dto/create-reconciliation-decision.dto.ts`
- Create: `apps/api/src/modules/reconciliation/application/services/reconciliation-decisions.service.ts`
- Test: `apps/api/src/modules/reconciliation/application/services/reconciliation-decisions.service.spec.ts`

- [x] **Step 1: Write failing service tests**
  Assert manual match links a tenant-owned payment, stores an immutable decision with `reasonCode`, updates the case to `MANUALLY_MATCHED`, and creates an `AuditLog`. Assert cross-tenant payment/case access throws `NotFoundException`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-decisions.service.spec.ts --runInBand`
  Expected: FAIL because the service/model do not exist.

- [x] **Step 3: Add Prisma model and migration**
  Add enum `ReconciliationDecisionAction` and model `ReconciliationDecision` with tenant/case/payment/actor references, append-only timestamps, reason/comment/metadata, and indexes by tenant/case/action.

- [x] **Step 4: Implement service transaction**
  Implement `createDecision(tenantId, actorUserId, caseId, dto)` to load tenant-owned case, validate optional tenant-owned payment, create the decision, update case status/link fields according to action, and create audit log.

- [x] **Step 5: Run GREEN**
  Run: `cd apps/api && npx prisma generate && npm test -- reconciliation-decisions.service.spec.ts --runInBand`
  Expected: PASS.

### Task 2: Decision APIs and Timeline

**Files:**
- Modify: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-cases.controller.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Modify: `apps/api/src/modules/reconciliation/application/services/reconciliation-cases.service.ts`
- Test: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-cases.controller.spec.ts`

- [x] **Step 1: Write failing controller metadata tests**
  Assert `POST /reconciliation/cases/:id/decisions` requires `reconciliation:manage` and `ReconciliationCapabilities.Manage`, while `GET /reconciliation/cases/:id/timeline` remains read-only.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-cases.controller.spec.ts --runInBand`
  Expected: FAIL before controller methods are added.

- [x] **Step 3: Add endpoints**
  Add `createDecision` and `timeline` controller methods, wire `ReconciliationDecisionsService`, and return tenant-scoped decision history ordered ascending.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-cases.controller.spec.ts --runInBand`
  Expected: PASS.

### Task 3: Web Manual Review Surface

**Files:**
- Create: `apps/web/src/types/reconciliation.types.ts`
- Create: `apps/web/src/services/reconciliation.service.ts`
- Create: `apps/web/src/stores/reconciliation.store.ts`
- Create: `apps/web/src/components/reconciliation/ReconciliationDecisionModal.vue`
- Modify: `apps/web/src/views/ReconciliationView.vue`
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`
- Test: `apps/web/src/__tests__/reconciliation-manual-review.spec.ts`

- [x] **Step 1: Write failing UI tests**
  Assert the route renders a reconciliation table and opens the reusable decision modal with a required reason code field.

- [x] **Step 2: Run RED**
  Run: `cd apps/web && npm run test:unit -- reconciliation-manual-review.spec.ts`
  Expected: FAIL because the store/service/modal do not exist.

- [x] **Step 3: Implement web store, service, modal, and view**
  Add list/detail/timeline/decision calls, display cases, expose manual actions, and submit decisions through the modal.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/web && npm run test:unit -- reconciliation-manual-review.spec.ts`
  Expected: PASS.

### Task 4: Validation

**Files:**
- All touched API/web files and plan file.

- [x] **Step 1: Run focused API tests**
  Run reconciliation decisions, controller, cases, matching, and ingestion tests.

- [x] **Step 2: Run focused web tests and i18n**
  Run the reconciliation UI test and `npm run i18n:check`.

- [x] **Step 3: Run build checks**
  Run `DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`, `cd apps/api && npm run build`, and `cd apps/web && npm run type-check`.

- [x] **Step 4: Review git status**
  Run `git status --short --branch --untracked-files=all`.
