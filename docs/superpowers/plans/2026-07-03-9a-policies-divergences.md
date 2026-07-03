# 9A Policies and Divergences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 9A.5 with controlled reconciliation policies, versioned minor-unit tolerances, and explicit currency/status divergence handling.

**Architecture:** Keep `ReconciliationPolicy` append-versioned: updates create a new active version and deactivate previous active rows for the same tenant/provider/currency instead of rewriting historical policy versions. Matching continues to snapshot `policyVersion` on `ReconciliationCase`, applies amount tolerance only after currency matches, and classifies provider/payment status mismatches as `STATUS_DIVERGENCE`.

**Tech Stack:** NestJS, Prisma, Jest, Swagger DTOs, existing reconciliation module, existing capability guards.

---

### Task 1: Policy Service and Versioning

**Files:**
- Create: `apps/api/src/modules/reconciliation/application/dto/create-reconciliation-policy.dto.ts`
- Create: `apps/api/src/modules/reconciliation/application/dto/list-reconciliation-policies-query.dto.ts`
- Create: `apps/api/src/modules/reconciliation/application/services/reconciliation-policies.service.ts`
- Test: `apps/api/src/modules/reconciliation/application/services/reconciliation-policies.service.spec.ts`

- [x] **Step 1: Write failing service tests**
  Assert creating a policy deactivates the previous active policy for the same tenant/provider/currency and creates the next version with `amountToleranceMinor` as `Decimal(18,0)`. Assert provider-specific and provider-neutral policies version independently.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-policies.service.spec.ts --runInBand`
  Expected: FAIL because service/DTOs do not exist.

- [x] **Step 3: Implement DTOs and service**
  Add list/create/update/deactivate methods. `createPolicy` and `updatePolicy` must never mutate historical rows except setting prior active rows to inactive.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-policies.service.spec.ts --runInBand`
  Expected: PASS.

### Task 2: Policy APIs

**Files:**
- Create: `apps/api/src/modules/reconciliation/application/dto/reconciliation-policy-response.dto.ts`
- Create: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-policies.controller.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Test: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-policies.controller.spec.ts`

- [x] **Step 1: Write failing controller metadata tests**
  Assert list uses `reconciliation.read` and create/update/deactivate use `reconciliation.manage`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-policies.controller.spec.ts --runInBand`
  Expected: FAIL because controller does not exist.

- [x] **Step 3: Add controller endpoints**
  Add `GET /reconciliation/policies`, `POST /reconciliation/policies`, `PUT /reconciliation/policies/:id`, and `POST /reconciliation/policies/:id/deactivate`.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-policies.controller.spec.ts --runInBand`
  Expected: PASS.

### Task 3: Matching Divergences

**Files:**
- Modify: `apps/api/src/modules/reconciliation/application/services/reconciliation-matching.service.ts`
- Test: `apps/api/src/modules/reconciliation/application/services/reconciliation-matching.service.spec.ts`

- [x] **Step 1: Write failing matching tests**
  Assert amount differences within policy tolerance become `RECONCILED` with the applied `policyVersion`, currency mismatches remain `CURRENCY_DIVERGENCE` even with high tolerance, and provider/payment status mismatches become `STATUS_DIVERGENCE`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-matching.service.spec.ts --runInBand`
  Expected: FAIL for missing tolerance/status behavior where applicable.

- [x] **Step 3: Update matching status resolution**
  Add provider status normalization and check status mismatch after currency and before amount tolerance. Keep currency before tolerance.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-matching.service.spec.ts --runInBand`
  Expected: PASS.

### Task 4: Validation

**Files:**
- All touched API files and plan file.

- [x] **Step 1: Run focused 9A.5 tests**
  Run policies service/controller and matching/cases/decisions tests.

- [x] **Step 2: Run Prisma validation and API build**
  Run `DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate` and `npm run build`.

- [x] **Step 3: Review git status**
  Run `git status --short --branch --untracked-files=all` and `git diff --check`.
