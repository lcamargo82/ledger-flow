# ADR 0039 — Sales Intelligence as a Read Layer

**Status:** Accepted
**Date:** 2026-07-14

## Context

Marketplace order, payment/fee, settlement net and stock state already belong to separate LedgerFlow domains. Users need an order-first consolidated view without creating competing sources of truth.

## Decision

Create `SalesIntelligenceModule` as a tenant-scoped read layer and `/sales-intelligence` as a separate analytical route. Keep `/orders` operational. Resolve net amount by explicit `REALIZED`, `RECONCILED`, `ESTIMATED`, `UNAVAILABLE` precedence and default the UI to one row per order with SKUs in a drawer.

## Consequences

- Source domains retain ownership and audit semantics.
- Query optimization and field-level provenance are mandatory.
- The Core can launch without profit, shipping, alerts or exports.
- A rebuildable snapshot may be introduced only after measured query pressure.
- The 11.0.4 volume regression keeps summaries in cursor batches of 500; no materialized snapshot is introduced without production evidence.

## Rejected

- Duplicating an authoritative sale ledger inside Sales Intelligence.
- Replacing `/orders` with the analytical screen.
- Showing estimated net as realized cash.
