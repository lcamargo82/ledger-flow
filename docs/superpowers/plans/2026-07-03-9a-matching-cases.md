# 9A Matching Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 9A.3 by adding ReconciliationCase, ReconciliationPolicy, automatic matching for settlement events, and tenant-scoped case list/detail APIs.

**Architecture:** Keep matching inside the reconciliation module and read Payments/Orders through Prisma by stable identifiers only. The `reconciliation.settlement_received` handler invokes the matching service; exact provider payment id and external reference can create tenant cases, while amount/time matching only marks ambiguous/unmatched candidates for later review.

**Tech Stack:** NestJS, Prisma, Jest, existing 8A async handler, Swagger DTOs, class-validator.

---

### Task 1: Prisma Models and Matching Engine

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260703203000_add_reconciliation_cases_and_policies/migration.sql`
- Create: `apps/api/src/modules/reconciliation/application/services/reconciliation-matching.service.ts`
- Test: `apps/api/src/modules/reconciliation/application/services/reconciliation-matching.service.spec.ts`

- [x] **Step 1: Write failing matching tests**
  Assert exact providerPaymentId reconciles a case, exact externalReference reconciles a case, amount mismatch creates `AMOUNT_DIVERGENCE`, and missing tenant/payment creates no tenant-scoped case.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-matching.service.spec.ts --runInBand`
  Expected: FAIL because models/service do not exist.

- [x] **Step 3: Add models and migration**
  Add enums `ReconciliationCaseStatus`, `ReconciliationMatchType`, models `ReconciliationCase` and `ReconciliationPolicy`, unique `[tenantId, settlementEventId]`, and relations to `ProviderSettlementEvent`/`Payment`.

- [x] **Step 4: Implement matching service**
  Find settlement by id, skip null tenant, skip existing case, try providerPaymentId first, externalReference second, amount/time candidate third. Persist expected/received/difference minor units and policy version.

- [x] **Step 5: Generate Prisma client**
  Run: `cd apps/api && npx prisma generate`
  Expected: client generation succeeds.

- [x] **Step 6: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-matching.service.spec.ts --runInBand`
  Expected: PASS.

### Task 2: Async Handler Integration

**Files:**
- Modify: `apps/api/src/modules/reconciliation/application/async-handlers/reconciliation-settlement-received.handler.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Test: `apps/api/src/modules/reconciliation/application/async-handlers/reconciliation-settlement-received.handler.spec.ts`

- [x] **Step 1: Write failing handler test**
  Assert the settlement received handler calls `matchSettlement(input.aggregateId)`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-settlement-received.handler.spec.ts --runInBand`
  Expected: FAIL because handler is still no-op.

- [x] **Step 3: Wire matching service into handler**
  Inject `ReconciliationMatchingService` and call `matchSettlement`.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-settlement-received.handler.spec.ts --runInBand`
  Expected: PASS.

### Task 3: Case List and Detail APIs

**Files:**
- Create: `apps/api/src/modules/reconciliation/application/dto/list-reconciliation-cases-query.dto.ts`
- Create: `apps/api/src/modules/reconciliation/application/dto/reconciliation-case-response.dto.ts`
- Create: `apps/api/src/modules/reconciliation/application/services/reconciliation-cases.service.ts`
- Create: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-cases.controller.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Test: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-cases.controller.spec.ts`

- [x] **Step 1: Write failing controller metadata tests**
  Assert `GET /reconciliation/cases` and `GET /reconciliation/cases/:id` require `reconciliation:read` and `ReconciliationCapabilities.Read`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-cases.controller.spec.ts --runInBand`
  Expected: FAIL because controller/service/DTOs do not exist.

- [x] **Step 3: Implement service and controller**
  Add paginated tenant-scoped list/detail using Prisma, include settlement/payment context, and throw 404 for cross-tenant detail.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-cases.controller.spec.ts --runInBand`
  Expected: PASS.

### Task 4: Validation

**Files:**
- All touched API files and plan file.

- [x] **Step 1: Run focused 9A.3 tests**
  Run matching, handler, controller, and existing 9A.2 tests.

- [x] **Step 2: Run Prisma validation and API build**
  Run `DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate` and `npm run build`.

- [x] **Step 3: Review git status**
  Run `git status --short --branch --untracked-files=all`.
