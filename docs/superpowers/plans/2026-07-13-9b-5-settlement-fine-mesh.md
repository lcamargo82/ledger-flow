# 9B-5 Settlement Fine Mesh

## Goal
Deliver a focused fine-mesh review layer for marketplace settlement cases using the existing 9A reconciliation case/decision foundation.

## Tasks
- [x] Add a controlled reconciliation reason-code registry and endpoint → Verify API test rejects invalid reason/action combinations and returns label keys.
- [x] Enrich case timeline/detail responses with settlement, payment, order and decision evidence → Verify service test returns tenant-scoped evidence without raw provider payloads.
- [x] Extend the web review flow into a case drawer/modal with evidence and timeline → Verify component test opens review, loads detail/timeline and renders reason codes.
- [x] Update pt-BR/en-US translations and public docs → Verify JSON/type checks and docs mention 9B-5 status.
- [x] Run focused API/web validation → Verify API tests/build and web tests/type-check for touched modules.

## Done When
- [x] Manual resolve/ignore/reopen/comment/match decisions remain append-only and audited.
- [x] Users review evidence before deciding and choose only controlled reason codes.
- [x] Swagger/Redoc-visible contracts, README/PRD/SDD/backlog/spec docs are updated.
