# ADR 0026: Tenant Overview and Operational Health

## Status
Accepted

## Context
As LedgerFlow scales to multiple clients (Tenants), the Platform Admin team needs visibility into the operational health of these tenants to offer proactive support, monitor systemic issues, and track business growth. However, due to data privacy and security concerns, Platform Admins should not have direct, unconstrained access to sensitive customer data (like individual customer details or full payment payloads) of other tenants unless explicitly required by an audit process.

We need a way to provide a high-level operational overview of each tenant, tracking key metrics and health indicators without violating data segregation boundaries.

## Decision
We decided to implement a specialized "Tenant Overview & Operational Health" module within the Platform Administration area.

1.  **Aggregated Queries**: We use database aggregation (`COUNT`, `GROUP BY`) instead of loading full relation records to generate operational metrics (total users, active customers, payment statuses). This prevents data leakage and avoids performance bottlenecks (N+1 queries).
2.  **Derived Health Status**: Instead of performing real-time remote health checks against external gateway APIs (which could be flaky and slow down our system), we derive the tenant's health status based on internal state:
    *   **HEALTHY**: Active tenant, valid subscription, no recent webhook processing failures, has gateway configured (or no payments processed yet).
    *   **ATTENTION**: Subscription past due, recent webhook failures, or processing payments without an active gateway configuration.
    *   **CRITICAL**: Tenant deactivated or subscription suspended/canceled.
    *   **UNKNOWN**: Insufficient data.
3.  **Strict Authorization**: We created new specific permissions (`platform:tenants:overview:read`, `platform:tenants:health:read`) assigned exclusively to the `PLATFORM_OWNER` role. Regular users or even Tenant Owners cannot access these endpoints.
4.  **No Impersonation or Tenant Switching**: We explicitly decided *not* to implement user impersonation or tenant-switching features at this stage to maintain strict auditability and prevent accidental cross-tenant data corruption. The Platform Admin views this data strictly through dedicated `/platform/tenants/:id/*` endpoints.

## Consequences
*   **Positive**: Platform Admins gain immediate visibility into tenant health without compromising data security.
*   **Positive**: Performance remains high as overview data is aggregated at the database level.
*   **Negative**: True remote connectivity issues with a tenant's configured gateway might not be immediately visible until a webhook fails or a payment explicitly errors out, as we rely on internal state rather than active polling. We accept this trade-off for system stability.
