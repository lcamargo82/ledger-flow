# ADR 0031: Mercado Pago OAuth Connection Foundation

## Status
Accepted

## Context
Our platform currently supports Asaas via API Key for payment processing. We need to integrate Mercado Pago to offer more options. Unlike Asaas (which we currently support via API keys in sandbox), Mercado Pago integration uses OAuth 2.0 for connecting merchant accounts to our platform application.
We need to leverage our existing multi-tenant architecture, gateway configuration entities, encryption, and audit systems, while implementing the OAuth flow for Mercado Pago.

## Decision
We decided to implement the Mercado Pago connection foundation using OAuth 2.0.

1. **OAuth Flow**:
   - Platform initiates the flow by redirecting the tenant owner to Mercado Pago's `/authorization` endpoint.
   - We generate a cryptographically secure `state` parameter bound to the `tenantId` and `userId`, stored in Redis with a short TTL (10 minutes).
   - Upon callback, we validate the `state` against Redis, consuming it to prevent replay attacks.
   - We exchange the `code` for an `access_token` and `refresh_token`.

2. **Credential Storage**:
   - The obtained `access_token` and `refresh_token` are encrypted using our existing `GatewayCredentialsEncryptionService`.
   - The encrypted credentials are saved in `GatewayConfiguration`.

3. **Multi-tenancy & Security**:
   - The connection is strictly bound to the authenticated tenant. The `tenantId` is never passed in the callback body or query; it is derived securely from the validated `state` in Redis.
   - Tokens and credentials are never returned in API responses or logged in Audit Logs.

4. **Platform Admin**:
   - Admin views remain generic, interacting with `GatewayConfiguration` without exposing provider-specific secrets. They can only view the status and toggle the connection (Suspend/Reactivate).

## Consequences
- **Positive**: Secure and standard OAuth integration. Reuses existing encryption and auditing. No exposure of tokens.
- **Negative**: Adds a dependency on Redis for state management during the OAuth flow.
