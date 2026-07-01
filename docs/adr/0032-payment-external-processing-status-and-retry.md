# ADR 0032: Payment External Processing Status & Safe Retry UX

## Context
During the process of payment creation using the Outbox Pattern with RabbitMQ, there can be failures when communicating with external payment gateways (such as Asaas, Mercado Pago). Historically, when the external charge creation failed, the internal `Payment` entity might falsely represent its status or lack clear visibility in the frontend of the external processing state. Furthermore, a failure in external processing would not allow the user to easily retry the operation safely.

## Decision
We implemented a robust presentation layer and a manual retry mechanism for external payment processing:
1. **Status Enrichment:** We created the `PaymentsExternalProcessingService` to calculate and inject the `externalProcessing` status dynamically when querying payments (`GET /payments` and `GET /payments/:id`). It evaluates `OutboxEvent` and `AsyncJobExecution` records to derive a deterministic integration status (`PROCESSING`, `FAILED`, `SUCCEEDED`, `RETRY_SCHEDULED`, `DEAD_LETTERED`, etc.) without altering the core `Payment.status` (which remains a financial status).
2. **Safe Manual Retry (`POST /payments/:id/retry-external-charge`):** We added an endpoint with `payments:retry` permission to allow authorized users to safely re-trigger the creation of a failed external charge. The service ensures idempotency by creating a new `OutboxEvent` referencing the original (`replayOfEventId`), avoiding reusing old RabbitMQ messages.
3. **Strict Orchestration Validation:** We ensure that only one compatible provider executes the new outbox event, and Mercado Pago will not act on Asaas charges, enforcing `CreateProviderChargeAsyncHandler` orchestration.
4. **UX Updates:** The frontend was updated (`PaymentsView.vue` and `PaymentDetails.vue`) to show the new "External Integration" status clearly and provide actionable buttons to "Try Again" or "Open Integrations" based on the failure context (e.g., invalid credentials).

## Consequences
- **Positive:** Clear separation between internal financial status and external integration status. Users have autonomy to retry failed payments securely. Improved visibility and debugging for integration errors directly in the UI.
- **Negative:** Increased complexity in the read paths (`list` and `getDetails`) due to joining `OutboxEvent` and `AsyncJobExecution`. This is currently mitigated by targeted querying and in-memory mapping, but may require caching or materialized views in the future if performance degrades.
