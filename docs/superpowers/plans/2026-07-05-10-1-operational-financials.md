# 10.1 Mercado Livre Operational Financials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sprint 10.1.8 by recording Mercado Livre operational financial facts for order revenue, fees, discounts, and freight without settlement or reconciliation semantics.

**Architecture:** Extend the Mercado Livre order adapter to normalize optional financial fields. Financial Intelligence owns persistence through `OrderFinancialFact`; Channels only passes normalized operational financial data after order intake. The fact components explicitly say operational only and not payment settlement.

**Tech Stack:** NestJS, Prisma Decimal, Jest, existing Channels order intake, FinancialIntelligenceService.

---

### Task 1: Financial Intelligence Operational Fact

**Files:**
- Modify: `apps/api/src/modules/financial-intelligence/application/services/financial-intelligence.service.ts`
- Modify: `apps/api/src/modules/financial-intelligence/application/services/financial-intelligence.service.spec.ts`

- [x] **Step 1: Write failing financial service test**

Assert a channel operational fact uses Decimal revenue, fee, discount, freight, COGS snapshots, `channelProvider`, and components that state it is not settlement/reconciliation.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- financial-intelligence.service.spec.ts --runInBand`
Expected: FAIL because channel operational financial fact creation does not exist.

- [x] **Step 3: Implement operational fact method**

Add `createChannelOrderOperationalFact()` with idempotency on the existing tenant/order/version key, Decimal parsing, components, audit, and outbox payload.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- financial-intelligence.service.spec.ts --runInBand`
Expected: PASS.

### Task 2: Mercado Livre Order Intake Integration

**Files:**
- Modify: `apps/api/src/modules/channels/domain/interfaces/channel-provider-adapter.interface.ts`
- Modify: `apps/api/src/modules/channels/infra/clients/mercado-livre-api.client.ts`
- Modify: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.ts`
- Modify: `apps/api/src/modules/channels/infra/adapters/mercado-livre-channel.adapter.spec.ts`
- Modify: `apps/api/src/modules/channels/application/services/channel-order-intake.service.ts`
- Modify: `apps/api/src/modules/channels/application/services/channel-order-intake.service.spec.ts`
- Modify: `apps/api/src/modules/channels/channels.module.ts`

- [x] **Step 1: Write failing adapter/intake tests**

Assert the adapter maps optional Mercado Livre financial fields and the intake service forwards them to Financial Intelligence after order creation/transition without tokens or raw payload.

- [x] **Step 2: Run RED**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts channel-order-intake.service.spec.ts --runInBand`
Expected: FAIL because financial mapping/integration is missing.

- [x] **Step 3: Implement adapter and intake wiring**

Add optional `financial` to `ChannelOrderDetails`, inject `FinancialIntelligenceService`, import `FinancialIntelligenceModule`, and create operational facts only when financial data exists.

- [x] **Step 4: Run GREEN**

Run: `cd apps/api && npm test -- mercado-livre-channel.adapter.spec.ts channel-order-intake.service.spec.ts --runInBand`
Expected: PASS.

### Task 3: Verification

**Files:**
- No additional files.

- [x] **Step 1: Run focused tests**

Run: `cd apps/api && npm test -- financial-intelligence.service.spec.ts mercado-livre-channel.adapter.spec.ts channel-order-intake.service.spec.ts orders.service.spec.ts --runInBand`
Expected: all suites pass.

- [x] **Step 2: Validate Prisma and build**

Run: `cd apps/api && DATABASE_URL=postgresql://ledgerflow:ledgerflow@localhost:5432/ledgerflow npx prisma validate`
Expected: schema valid.

Run: `cd apps/api && npm run build`
Expected: Nest build succeeds.

- [x] **Step 3: Check patch hygiene**

Run: `git diff --check`
Expected: no whitespace errors.
