# Commerce Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 10.0.1 by adding commerce module boundaries and server-side commercial capabilities without implementing product, stock, or order domain behavior yet.

**Architecture:** Keep LedgerFlow as a NestJS modular monolith. Reuse existing RBAC permissions, add a separate commercial capability policy based on tenant subscription plan, and mirror capability state in Vue only for UX. Swagger and Redoc continue to be generated from Nest decorators.

**Tech Stack:** NestJS, Prisma, Jest, Vue 3, Pinia, Vue Router, JSON i18n, Vite/Vitest.

---

### Task 1: Capability Policy and Guard

**Files:**
- Create: `apps/api/src/modules/platform/domain/constants/platform-capabilities.ts`
- Create: `apps/api/src/modules/platform/application/services/capability-policy.service.ts`
- Create: `apps/api/src/modules/auth/presentation/decorators/require-capabilities.decorator.ts`
- Create: `apps/api/src/modules/auth/presentation/guards/capability.guard.ts`
- Modify: `apps/api/src/modules/platform/platform.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/modules/platform/application/services/capability-policy.service.spec.ts`
- Test: `apps/api/src/modules/auth/presentation/guards/capability.guard.spec.ts`

- [ ] **Step 1: Write failing policy tests**

Create tests proving `PROFESSIONAL` has inventory capability, `STARTER` does not, inactive subscriptions are denied, and unknown tenants are denied.

- [ ] **Step 2: Run RED**

Run: `cd apps/api && npm test -- capability-policy.service.spec.ts --runInBand`
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement policy**

Add a centralized capability list:

```ts
export const CommerceCapabilities = {
  CatalogManage: 'catalog.manage',
  InventoryManage: 'inventory.manage',
  InventoryAdjust: 'inventory.adjust',
  OrdersManage: 'orders.manage',
  InventoryReportsRead: 'inventory.reports.read',
  ChannelsConnect: 'channels.connect',
  ChannelsImportListings: 'channels.import_listings',
  ChannelsMappingManage: 'channels.mapping.manage',
  ChannelsSyncInventory: 'channels.sync_inventory',
  OrdersChannelIntake: 'orders.channel_intake',
  FinancialAnalyticsRead: 'financial.analytics.read',
} as const;
```

Map current `SubscriptionPlan` values conservatively: `PROFESSIONAL`, `ENTERPRISE`, and `CUSTOM` receive the initial ERP Basic capabilities; `ENTERPRISE` and `CUSTOM` receive Commerce and financial analytics capabilities. `FREE` and `STARTER` receive none for 10.0 modules.

- [ ] **Step 4: Write failing guard tests**

Test that the guard allows when all required capabilities are present, returns true when route has no metadata, and throws 403 when capability is missing.

- [ ] **Step 5: Run RED**

Run: `cd apps/api && npm test -- capability.guard.spec.ts --runInBand`
Expected: FAIL because decorator/guard do not exist.

- [ ] **Step 6: Implement decorator and guard**

Add `@RequireCapabilities(...capabilities)` metadata and a global `CapabilityGuard` after `PermissionGuard`. The guard reads `request.user.tenantId`, checks capabilities through `CapabilityPolicyService`, and throws `ForbiddenException('Insufficient capabilities')`.

- [ ] **Step 7: Run GREEN**

Run: `cd apps/api && npm test -- capability-policy.service.spec.ts capability.guard.spec.ts --runInBand`
Expected: PASS.

### Task 2: Empty Commerce Modules and Protected Foundation Endpoints

**Files:**
- Create module folders under `apps/api/src/modules/catalog`, `inventory`, `orders`, `channels`, `financial-intelligence`
- Create one controller per module exposing `GET /<module>/capabilities/status`
- Modify: `apps/api/src/app.module.ts`
- Test: controller specs for at least inventory capability blocking through guard metadata

- [ ] **Step 1: Write failing controller metadata tests**

Assert the inventory status endpoint has `inventory.manage` permission and `inventory.manage` capability metadata. Assert catalog/orders/channels/financial-intelligence controllers expose OpenAPI tags.

- [ ] **Step 2: Run RED**

Run: `cd apps/api && npm test -- commerce-foundation --runInBand`
Expected: FAIL because modules/controllers do not exist.

- [ ] **Step 3: Implement empty modules and endpoints**

Each endpoint returns:

```json
{ "module": "inventory", "status": "foundation_ready" }
```

Use existing `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiOkResponse`, `@ApiUnauthorizedResponse`, and `@ApiForbiddenResponse`.

- [ ] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- commerce-foundation --runInBand`
Expected: PASS.

### Task 3: Seed Permissions and Frontend Capability UX

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Modify: `apps/web/src/types/auth.types.ts`
- Modify: `apps/web/src/stores/auth.store.ts`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/layouts/AppLayout.vue`
- Modify: `apps/web/src/locales/pt-BR.json`
- Modify: `apps/web/src/locales/en-US.json`
- Test: `apps/web/src/__tests__/commerce-navigation.spec.ts`

- [ ] **Step 1: Write failing frontend test**

Mount or inspect router/layout behavior to prove `/inventory` requires `inventory:read` permission and `inventory.manage` capability, and the menu label uses `nav.inventory`.

- [ ] **Step 2: Run RED**

Run: `cd apps/web && npm run test:unit -- commerce-navigation.spec.ts`
Expected: FAIL because route/capability keys do not exist.

- [ ] **Step 3: Add commerce permissions to seed**

Add tenant-scoped permissions:

```ts
catalog:read
catalog:manage
inventory:read
inventory:manage
inventory:adjust
orders:read
orders:manage
channels:read
channels:manage
financial-intelligence:read
```

Owner receives them automatically through existing TENANT permission assignment.

- [ ] **Step 4: Add frontend capability checks**

Extend auth user type with optional `capabilities?: string[]`, add `checkCapability` and `checkAllCapabilities` getters/actions that default to false when missing, add `/inventory` placeholder route, and add inventory nav item gated by permission plus capability.

- [ ] **Step 5: Run GREEN**

Run: `cd apps/web && npm run test:unit -- commerce-navigation.spec.ts`
Expected: PASS.

### Task 4: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/sdd.md`
- Modify: `docs/ui-flow.md`
- Modify: `docs/ui-screens.md`
- Modify: `docs/backlog/10.0-commerce-inventory-backlog.md`
- Modify: `docs/specs/10.0-sprint-plan.md`

- [ ] **Step 1: Update docs**

Document Sprint 10.0.1 completion, capability policy, `/api/docs`, `/api/reference`, `/api/openapi.json`, and initial module routes.

- [ ] **Step 2: Run API tests**

Run: `cd apps/api && npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 3: Run web checks**

Run: `cd apps/web && npm run test:unit -- --run`
Expected: PASS.

Run: `cd apps/web && npm run i18n:check`
Expected: PASS.

- [ ] **Step 4: Build or type-check touched apps**

Run: `cd apps/api && npm run build`
Expected: PASS.

Run: `cd apps/web && npm run type-check`
Expected: PASS.

