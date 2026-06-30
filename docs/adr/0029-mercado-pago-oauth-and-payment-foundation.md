# 0029 - Mercado Pago OAuth and Payment Foundation

## Context and Problem Statement
We need to introduce Mercado Pago as the second functional payment gateway in LedgerFlow. The integration must support multi-tenancy and reuse the existing robust async processing architecture (Transactional Outbox, RabbitMQ, DLQ, etc.). We want to support OAuth for tenant onboarding and implement PIX and Boleto payment creation.

## Decision Drivers
- Multi-tenancy: each tenant connects their own Mercado Pago account.
- Security: sensitive credentials must be encrypted and not exposed in logs or APIs.
- Existing Infrastructure: avoid building custom architecture when `IPaymentGateway` and `PaymentGatewayOrchestrationService` are already in place.
- Asynchronous Processing: Payment requests must be processed asynchronously to ensure high availability and prevent stalling requests.

## Considered Options
1. Implement a separate module for Mercado Pago.
2. Extend the existing `gateways` module, adhering to the `IPaymentGateway` interface.

## Decision
We decided on Option 2. We created `MercadoPagoPaymentGatewayAdapter` implementing `IPaymentGateway`, and `MercadoPagoOAuthService` for token exchange. We introduced `MercadoPagoCreateChargeAsyncHandler` that listens to `payment.provider_charge_creation_requested` and creates the charge using the active gateway configuration (which could be Mercado Pago).

### Implementation Details
- **OAuth State Management:** `MercadoPagoOAuthStateService` handles short-lived state variables to prevent CSRF attacks during the OAuth flow.
- **Async Workers:** `MercadoPagoCreateChargeAsyncHandler` runs independently, verifying if the tenant's active provider is Mercado Pago before orchestrating the charge.
- **Frontend Integration:** Added a new Gateway Settings View (`/settings/gateways`) where tenants can securely connect their MP accounts.

## Status
Accepted

## Consequences
- **Positive:** We now support multiple real payment gateways, leveraging a scalable plugin architecture. The security of tenant credentials is preserved through `GatewayCredentialsEncryptionService`.
- **Negative:** We must be careful about async handler routing. Right now, all handlers receive the charge creation event and skip processing if their respective provider is not the active one. In the future, we might need a single routing handler that dispatches to the correct specific handler.
