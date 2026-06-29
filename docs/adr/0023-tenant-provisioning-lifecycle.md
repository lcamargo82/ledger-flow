# 23. Tenant Provisioning & Lifecycle Management

Date: 2026-06-29

## Status

Accepted

## Context

LedgerFlow is a multi-tenant platform. We need a robust and secure way to create new customer tenants, assign a subscription plan, create the initial owner user, and send a secure invitation link so the owner can define their password and activate their account. This process must be transactional to prevent partial states (e.g., a tenant created without an owner, or a user created without a role).

## Decision

We have implemented a unified `TenantProvisioningService` that handles the atomic creation of:
1. `Tenant` (kind: CUSTOMER)
2. `TenantSubscription` (with initial trial or active status)
3. `Role` (OWNER, copied from system defaults)
4. `User` (The owner, created without a usable password)
5. `TenantAdminInvitation` (A secure token linked to the owner)

We have decoupled the email delivery from the database transaction. The email is triggered asynchronously after the transaction successfully commits to ensure the user receives a valid token and we avoid side-effects inside database transactions.

Additionally, the activation flow allows the owner to set their password through a public `/auth/accept-tenant-invitation` endpoint.

## Consequences

- **Positive:** Guarantees data consistency for new tenants.
- **Positive:** Provides a smooth onboarding experience via email invitation.
- **Positive:** Secure, as we do not log or return raw passwords or tokens in standard APIs; tokens are hashed in the database.
- **Negative:** Adds complexity to the provisioning flow and requires managing invitation statuses and expirations.
