# 24. Platform Admin Dual-Role and Permission Scopes

Date: 2026-06-29
Status: Accepted

## Context

In the LedgerFlow multi-tenant architecture, the Platform Admin needs the ability to perform global platform administrative tasks (e.g., managing tenants, suspending organizations) while also participating as a regular user within the internal `LedgerFlow Platform` tenant (e.g., managing internal roles, user access, billing configurations).

Initially, the Platform Admin was assigned a single `PLATFORM_OWNER` role. However, granting global platform permissions to standard roles or mixing tenant-level and platform-level permissions creates significant security risks, primarily privilege escalation. 

## Decision

We have decided to implement a dual-role approach supported by a strict permission scoping mechanism:

1. **Permission Scope (PermissionScope Enum)**: A new enum `PermissionScope` (`TENANT` | `PLATFORM`) is introduced at the database schema level (`Permission` model). This categorizes whether a permission governs standard tenant operations or global platform capabilities.
2. **Dual-Role Assignment**: The Platform Admin is assigned two explicit roles:
   - `OWNER`: Grants access to standard tenant capabilities scoped only to the internal platform tenant.
   - `PLATFORM_OWNER`: Grants access to global platform capabilities (endpoints under `/platform/*`).
3. **Backend Safeguards**: The API strictly enforces that only users operating within the `PLATFORM` tenant who possess `isPlatformAdmin = true` can assign or manage roles containing `PLATFORM` scope permissions. Customer tenants will never be able to view, assign, or create roles with `PLATFORM` permissions.
4. **Frontend UI Separation**: The user interface clearly segregates navigation into "Operations" (Tenant scope) and "Platform" (Platform scope) to provide a clear mental model for the administrator.

## Consequences

- **Security**: Eliminates the risk of privilege escalation. Customer owners cannot accidentally or maliciously gain platform permissions.
- **Complexity**: Adds slight complexity to role assignment and permission filtering in the backend, and requires the frontend to adapt views conditionally based on the user's `isPlatformAdmin` flag.
- **Maintainability**: Clearer separation of concerns. Permissions are explicitly scoped, making audit logging and access reviews simpler.
