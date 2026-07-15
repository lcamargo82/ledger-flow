# Channel Replay and RabbitMQ Routing

## Goal

Restore channel processing without unsafe queue manipulation and expose audited replay controls in the Channels UI.

## Tasks

- [x] Fix RabbitMQ routes for marketplace settlement and consumed domain events; verify pending outbox types are routable.
- [x] Prevent unroutable events from starving the outbox indefinitely; verify attempts are bounded and later events progress.
- [x] Add tenant-scoped bulk webhook replay with permission, limits, audit and per-item results; verify invalid states are skipped safely.
- [x] Wire individual and bulk replay controls into the sanitized Channels inbox with confirmation, loading state and i18n.
- [x] Diagnose the Mercado Livre listing import timeout and move the UI to an operation-appropriate timeout/error behavior.
- [x] Add regression tests for topology, replay API/store/UI and run API/web validation.

## Done When

- [x] Failed inbox events can be replayed individually or in a bounded batch after channel configuration is corrected.
- [x] Current production pending event types have valid routes and cannot monopolize the dispatcher forever.
- [x] API and web focused tests, web lint/i18n/type-check and both builds pass. The repository-wide API lint remains blocked by pre-existing violations outside this change.
