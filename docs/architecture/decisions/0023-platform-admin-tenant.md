# 23. Platform Admin and Tenant Subscription Foundation

Date: 2026-06-28

## Status
Accepted

## Context
LedgerFlow operates as a multi-tenant B2B platform. Up until now, all tenants were considered "customer" organizations, and there was no overarching administrative layer to manage the platform itself (e.g., viewing all tenants, suspending accounts, managing subscriptions). We needed a way to introduce a "Platform Admin" concept without breaking the existing robust tenant isolation, and without mixing the privileges of a platform admin with those of a regular tenant owner.

## Decision
We decided to implement the **Platform Admin** layer by establishing a special tenant kind (`PLATFORM`) and adding an `isPlatformAdmin` flag to the User model, rather than creating a completely separate table or authentication flow. 

1. **Tenant Kind:** We added a `kind` field to the `Tenant` model (`TenantKind: CUSTOMER | PLATFORM`). This clearly distinguishes the platform's own organization from customer organizations.
2. **User Flag:** An `isPlatformAdmin` boolean on the `User` model acts as a hard boundary. Even if a user is within the Platform tenant, they must explicitly have this flag to access platform-wide endpoints.
3. **Subscriptions:** We added a `TenantSubscription` model to handle basic subscription details (`plan`, `status`, `trialEndsAt`, etc.) with a 1:1 relation to `Tenant`.
4. **Security:** Platform endpoints are guarded by a new `PlatformAdminGuard` which verifies that the user belongs to the `PLATFORM` tenant, has `isPlatformAdmin = true`, and possesses the required `platform:*` permissions.
5. **Separation of Concerns:** The platform API routes (`/platform/*`) explicitly require a target `tenantId` parameter in the URL and never accept it from the body, ensuring platform admins act on explicit target tenants rather than polluting their own context.

## Consequences

**Positive:**
- **Simplicity:** We reuse the existing `User` and `Tenant` structures, avoiding a parallel authentication system for admins.
- **Security:** The triple-check (tenant kind, admin flag, permissions) provides defense-in-depth against privilege escalation.
- **Scalability:** The `TenantSubscription` model sets the stage for future billing integration (Stripe/Iugu).

**Negative:**
- **Complexity in Guards:** The auth guards become slightly more complex as they must distinguish between regular tenant roles and platform admin permissions.

## Notes
- The initial seed now creates a default `PLATFORM` tenant and a Master Admin user using `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` environment variables.
