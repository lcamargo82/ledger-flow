# Sales Intelligence 11.0 Completion

## Goal

Finish 11.0.5–11.0.7 without widening the primary table, and replace technical inventory identifiers with human-readable operational labels.

## Tasks

- [x] Record D4–D6 in PRD/SDD/ADR/backlog and expose new RBAC contracts → Verify: docs and permission migration agree.
- [x] Add tenant low-margin policy and enriched sale detail/read contracts → Verify: Prisma validation and focused service tests.
- [x] Implement profitability, shipping, settlement/cash and sanitized timeline endpoints → Verify: authorization/redaction and chronological timeline tests.
- [x] Build the complete responsive drawer while keeping the main table compact → Verify: pt-BR/en-US component tests and browser smoke.
- [x] Add prioritized alerts through the existing notification/outbound pipeline → Verify: loss, missing-cost, low-margin, disable and idempotency tests.
- [x] Add permission-aware streamed Sales Intelligence CSV jobs → Verify: bounded batches, redacted columns and CSV injection tests.
- [ ] Enrich inventory balances, movements, reservations, transfers and cycle counts with product/SKU/warehouse labels → Verify: repository and UI tests contain no UUID columns.
- [ ] Add metrics, indexes, runbook and volume/E2E coverage → Verify: OpenAPI, builds, lint, i18n, audit and runtime smoke pass.
- [ ] Commit/push sprint branches, merge them into the 11.0 completion base and integrate into develop → Verify: clean synchronized worktree.

## Done When

- [ ] 11.0.5–11.0.7, D4–D6 and all inventory label screens are implemented, documented and verified.
