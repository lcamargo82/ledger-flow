# 9A Reconciliation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 9A.1 by adding the Reconciliation module foundation, authorization contracts, protected API status endpoint, frontend shell route, menu, empty state, and i18n without settlement/case migrations.

**Architecture:** Reuse the existing Nest modular-monolith pattern, global `CapabilityGuard`, RBAC decorators, Vue Router route metadata, Pinia auth capability checks, and shared shell components. Keep reconciliation capabilities separate from commerce capabilities but available through the same guard type and policy service.

**Tech Stack:** NestJS, Prisma seed, Jest, Vue 3, Pinia, Vue Router, JSON i18n, Vitest.

---

### Task 1: Reconciliation Capabilities and API Foundation

**Files:**
- Modify: `apps/api/src/modules/platform/domain/constants/platform-capabilities.ts`
- Modify: `apps/api/src/modules/platform/application/services/capability-policy.service.ts`
- Modify: `apps/api/src/modules/auth/presentation/decorators/require-capabilities.decorator.ts`
- Create: `apps/api/src/modules/reconciliation/reconciliation.module.ts`
- Create: `apps/api/src/modules/reconciliation/presentation/controllers/reconciliation-foundation.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/inventory/presentation/controllers/commerce-foundation.controllers.spec.ts`

- [x] **Step 1: Write failing metadata tests**
  Add assertions that `ReconciliationFoundationController.getStatus()` requires `reconciliation:read` and `ReconciliationCapabilities.Read`, and that the controller has OpenAPI tag `Reconciliation`.

- [x] **Step 2: Run RED**
  Run: `cd apps/api && npm test -- commerce-foundation --runInBand`
  Expected: FAIL because reconciliation capability/controller/module do not exist.

- [x] **Step 3: Implement minimal backend foundation**
  Add `ReconciliationCapabilities`, widen the `Capability` type, include reconciliation capabilities in `ENTERPRISE`/`CUSTOM`, add the foundation controller, module, and AppModule import.

- [x] **Step 4: Run GREEN**
  Run: `cd apps/api && npm test -- commerce-foundation --runInBand`
  Expected: PASS.

### Task 2: Permissions Seed and Frontend Shell

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Create: `apps/web/src/views/ReconciliationView.vue`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/layouts/AppLayout.vue`
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`
- Modify: `apps/web/src/__tests__/commerce-navigation.spec.ts`

- [x] **Step 1: Write failing frontend test**
  Assert `/reconciliation` requires `reconciliation:read` and `reconciliation.read`, and assert pt-BR/en-US labels for navigation and empty state.

- [x] **Step 2: Run RED**
  Run: `cd apps/web && npm run test:unit -- commerce-navigation.spec.ts --run`
  Expected: FAIL because the route and labels do not exist.

- [x] **Step 3: Implement frontend shell**
  Add route, import view, enabled nav item gated by permission/capability, and a simple empty state using existing shared components.

- [x] **Step 4: Add seed permissions**
  Add `reconciliation:read`, `reconciliation:manage`, `reconciliation:export`, and `reconciliation:sync` as tenant-scoped permissions.

- [x] **Step 5: Run GREEN**
  Run: `cd apps/web && npm run test:unit -- commerce-navigation.spec.ts --run`
  Expected: PASS.

### Task 3: Validation

**Files:**
- All touched API, web, and docs files.

- [x] **Step 1: Run focused API test**
  Run: `cd apps/api && npm test -- commerce-foundation --runInBand`
  Expected: PASS.

- [x] **Step 2: Run focused web test**
  Run: `cd apps/web && npm run test:unit -- commerce-navigation.spec.ts --run`
  Expected: PASS.

- [x] **Step 3: Run i18n check**
  Run: `cd apps/web && npm run i18n:check`
  Expected: PASS.

- [x] **Step 4: Review git diff**
  Run: `git diff --stat`
  Expected: only 9A docs plus foundation implementation files changed.
