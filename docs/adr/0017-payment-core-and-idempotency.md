# ADR 0017: Payment Core and Idempotency

## Date
2026-06-19

## Status
Accepted

## Context
LedgerFlow requires a robust payment processing foundation capable of handling multitenancy, idempotency, strict state transitions, and auditability. The system needs to be prepared for future real payment gateway integrations (e.g., Stripe) without coupling the core domain to any specific provider prematurely.

## Decision
We implemented a Payment Core Backend Foundation with the following technical design choices:

1. **Amount Representation**: All monetary values are stored as integers in **cents** to prevent floating-point precision issues.
2. **Status Lifecycle**: Payments follow a strict state machine (`PENDING` -> `PROCESSING` -> `APPROVED` | `FAILED` | `CANCELED`). Transitions are strictly validated.
3. **Idempotency Strategy**: 
   - We require an `Idempotency-Key` header for `POST /payments`.
   - The key is scoped per tenant.
   - We store an `idempotencyKeyHash` (SHA-256) instead of the raw key for security.
   - We store an `idempotencyRequestHash` to ensure the payload hasn't changed between retries with the same key.
4. **Multitenancy Isolation**: Payments do not expose or accept `tenantId` from the frontend payload. It is strictly injected via the authenticated context.
5. **Gateway Abstraction**: Currently, endpoints for approval, cancellation, and refunds operate internally (simulated). Gateway interactions are deferred to a later phase.

## Consequences
- **Positive**: High security against replay attacks and accidental duplicate charges. Safe handling of monetary values.
- **Negative**: Adds overhead to payment creation due to hashing and database checks. Developers must strictly use cents for all payment logic. Refund and approval features are currently mock-only until the gateway integration is finalized.
