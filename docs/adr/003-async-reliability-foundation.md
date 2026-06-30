# ADR 003: Async Reliability Foundation (Outbox, RabbitMQ & Workers)

## Status
Accepted

## Context
The platform needs to communicate with external providers (like Asaas, Mercado Pago, etc.) for high-volume operations such as charge creation and webhook processing. Synchronous communication directly from the API can lead to slow response times, partial failures, and data inconsistency if the database transaction succeeds but the external call fails. We need a reliable, resilient, and decoupled infrastructure to handle these operations.

## Decision
We decided to implement the **Transactional Outbox Pattern** combined with **RabbitMQ** and a separate **Worker** process.
1. **Outbox Pattern:** When a business entity (e.g., Payment, WebhookInboxEvent) is created or updated in the PostgreSQL database, an `OutboxEvent` is saved in the exact same transaction. This guarantees that either both succeed or both fail.
2. **Outbox Dispatcher:** A background process polls the `OutboxEvent` table (using `FOR UPDATE SKIP LOCKED` to prevent concurrency issues between multiple dispatcher instances) and publishes the events to RabbitMQ.
3. **RabbitMQ:** Acts as the message broker. Messages are routed using Topic Exchanges to specific queues (e.g., `payment.commands.q`). Dead Letter Exchanges (DLX) are configured to handle failed messages.
4. **Idempotent Consumers:** The Worker processes consume messages from RabbitMQ. They use the `AsyncJobExecution` table to ensure idempotency. If an event has already been processed successfully, it is ignored.
5. **Rate Limiting & Retries:** Redis is used for a simple rate-limiting semaphore for external provider calls. A retry policy with exponential backoff handles transient failures.

## Consequences
- **Positive:** Guaranteed consistency between our database and the message broker. High availability and resilience against external provider downtime. Decoupled architecture allowing independent scaling of the API and the Worker.
- **Negative:** Increased operational complexity (managing RabbitMQ, Redis, and Worker instances). Polling the database introduces slight latency compared to direct publishing (though mitigated by frequent polling intervals and batching).
