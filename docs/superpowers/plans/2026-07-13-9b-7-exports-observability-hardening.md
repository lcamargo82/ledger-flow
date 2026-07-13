# 9B-7 Exports, Observability and Hardening

## Goal
Close the 9B marketplace settlement track with export coverage, sanitized operational health, and final readiness documentation.

## Tasks
- [x] Add marketplace settlement CSV export type → Verify export test streams settlement events with tenant/account/date filters.
- [x] Expose reconciliation export types in the web UI → Verify type/i18n checks include 9B export labels.
- [x] Add sanitized settlement health snapshot → Verify health test returns counts/status without raw provider payloads.
- [x] Update final docs/runbook/checklist → Verify README, PRD, SDD, backlog, spec, runbook and AsyncAPI mention 9B-7 closure.
- [x] Run focused validation → Verify API tests/build, Prisma generation, web type-check and i18n pass.

## Done When
- [x] 9B exports work through the existing async ExportJob pipeline.
- [x] Health/observability is safe for operations and does not expose secrets or raw provider payloads.
- [x] Remaining 9B work is documented as operational evidence rather than missing implementation.
