# Production Migration and Pagination Hotfix

## Goal

Recover the blocked Sales Intelligence production migration and expose pagination controls wherever the API and store already return paginated data.

## Tasks

- [x] Correct the Sales Intelligence policy foreign-key type from UUID to TEXT → Verify: migration applies on a PostgreSQL schema rebuilt from migration history.
- [x] Add failing UI/store tests for missing page navigation → Verify: tests identify reconciliation, analytics, inventory and exports gaps.
- [x] Connect `AppTable` pagination for reconciliation, analytics and exports → Verify: page changes update filters and refetch.
- [x] Add independent inventory page state and controls for all inventory lists → Verify: each tab changes only its own page.
- [x] Audit other table views with paginated contracts and include prepared gaps in scope → Verify: no paginated store metadata is left disconnected without an explicit reason.
- [x] Run focused and full web tests, lint, i18n and builds; validate Prisma migration history → Verify: all commands pass.
- [x] Commit and push the hotfix directly to `develop` → Verify: clean worktree synchronized with `origin/develop`.

## Done When

- [x] Production can mark the failed attempt rolled back and re-run the corrected migration, and every in-scope paginated table exposes functional navigation.

## Notes

- Platform async operations remain a separate backend task: its query DTO/controller currently ignore page input, so it is not a prepared paginated contract.
