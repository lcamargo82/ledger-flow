# 9A Dashboard and Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 9A.6 with tenant/filter-scoped reconciliation KPIs, aging, provider/status breakdowns, and a compact dashboard surface in the reconciliation view.

**Architecture:** Add a read-only dashboard service under the reconciliation module that reuses `ReconciliationCase` snapshots rather than payments/orders margin data. The API applies tenant, provider, status, currency, and date filters consistently across KPI totals, aging buckets, and breakdowns. The web view consumes the dashboard alongside the case list and renders operational cards/bars without introducing chart dependencies.

**Tech Stack:** NestJS, Prisma, Jest, Swagger DTOs, Vue 3, Pinia, Vitest, existing i18n and common UI components.

---

### Task 1: Dashboard Service

**Files:**
- Create: `apps/api/src/modules/reconciliation/application/dto/reconciliation-dashboard-query.dto.ts`
- Create: `apps/api/src/modules/reconciliation/application/services/reconciliation-dashboard.service.ts`
- Test: `apps/api/src/modules/reconciliation/application/services/reconciliation-dashboard.service.spec.ts`

- [x] **Step 1: Write failing dashboard service tests**
  Assert the service applies tenant and filters to all queries, returns expected/reconciled/pending/divergent minor-unit totals, builds status/provider counts, and computes aging buckets from unresolved case ages.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-dashboard.service.spec.ts --runInBand`
  Expected: FAIL because service/DTO do not exist.

- [x] **Step 3: Implement query DTO and service**
  Add `dateFrom`, `dateTo`, `provider`, `status`, and `currency` filters. Use case snapshots only: `expectedAmountMinor`, `receivedAmountMinor`, `differenceAmountMinor`, status, provider, and createdAt.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-dashboard.service.spec.ts --runInBand`
  Expected: PASS.

### Task 2: Dashboard API

**Files:**
- Create: `apps/api/src/modules/reconciliation/application/dto/reconciliation-dashboard-response.dto.ts`
- Create: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-dashboard.controller.ts`
- Modify: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Test: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-dashboard.controller.spec.ts`

- [x] **Step 1: Write failing controller metadata tests**
  Assert `GET /reconciliation/dashboard` requires `reconciliation:read` and `ReconciliationCapabilities.Read`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- reconciliation-dashboard.controller.spec.ts --runInBand`
  Expected: FAIL because controller does not exist.

- [x] **Step 3: Add dashboard controller and module wiring**
  Add a read-only controller method calling `getDashboard(user.tenantId, query)`.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- reconciliation-dashboard.controller.spec.ts --runInBand`
  Expected: PASS.

### Task 3: Web Dashboard Surface

**Files:**
- Modify: `apps/web/src/types/reconciliation.types.ts`
- Modify: `apps/web/src/services/reconciliation.service.ts`
- Modify: `apps/web/src/stores/reconciliation.store.ts`
- Modify: `apps/web/src/views/ReconciliationView.vue`
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`
- Test: `apps/web/src/__tests__/reconciliation-dashboard.spec.ts`

- [x] **Step 1: Write failing UI test**
  Assert the reconciliation view fetches dashboard data, renders KPIs, aging buckets, and the cash/margin separation note.

- [x] **Step 2: Run RED**
  Run: `cd apps/web && npm run test:unit -- reconciliation-dashboard.spec.ts`
  Expected: FAIL before dashboard service/store/view support exists.

- [x] **Step 3: Implement web types/service/store/view/i18n**
  Add `getDashboard`, store state, filter refresh, KPI cards, aging bars, provider breakdown, status breakdown, and copy that clarifies this is cash reconciliation rather than operational margin.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/web && npm run test:unit -- reconciliation-dashboard.spec.ts`
  Expected: PASS.

### Task 4: Validation

**Files:**
- All touched API/web files and plan file.

- [x] **Step 1: Run focused API tests**
  Run dashboard, policies, matching, cases, decisions, and ingestion tests.

- [x] **Step 2: Run focused web tests and i18n**
  Run reconciliation dashboard/manual review tests and `npm run i18n:check`.

- [x] **Step 3: Run build checks**
  Run `DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`, `cd apps/api && npm run build`, and `cd apps/web && npm run type-check`.

- [x] **Step 4: Review git status**
  Run `git status --short --branch --untracked-files=all` and `git diff --check`.
