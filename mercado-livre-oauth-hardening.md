# Mercado Livre OAuth hardening

## Goal
Complete the Mercado Livre OAuth lifecycle with a public callback, automatic token renewal, and a new-tab authorization experience.

## Tasks
- [x] Add failing controller metadata and frontend navigation tests.
- [x] Add failing API client and credential lifecycle tests for refresh success/failure.
- [x] Mark the callback public and redirect its result safely to the web channels page.
- [x] Implement refresh-token exchange and a tenant-scoped credential lifecycle service.
- [x] Route listing import, order intake, and inventory sync through refreshed credentials.
- [x] Open authorization in a new tab without opener access.
- [x] Run focused tests, lint/type checks, builds, and diff validation.

## Done When
- [x] OAuth callback works without JWT and returns the user to the channels UI.
- [x] Expiring credentials refresh once and persist encrypted replacements.
- [x] Invalid refresh marks the integration as `REAUTH_REQUIRED` without leaking secrets.
- [x] Mercado Livre authorization opens in a separate tab.
