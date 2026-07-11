# 10.1.10 Channel Operational Configuration

## Goal
Complete Mercado Livre operational configuration, safe integration actions, health projection, and OAuth feedback in the existing Channels UI.

## Tasks
- [x] Add failing service/controller tests for sanitized detail/list, tenant-safe settings, and status transitions.
- [x] Implement settings DTO, repository operations, sanitized projection, and Swagger endpoints.
- [x] Add failing web service/store/view tests for settings/actions and OAuth feedback.
- [x] Implement typed APIs, settings modal, warehouse selection, action controls, toast, and cross-tab refresh.
- [x] Update pt-BR/en-US and mark 10.1.10 documentation status accurately.
- [x] Run focused tests, lint/type checks, builds, i18n audit, and diff validation.

## Done When
- [x] No integration response exposes encrypted credentials or webhook hashes.
- [x] Warehouse is validated against the authenticated tenant.
- [x] Configure/import/reconnect/suspend/reactivate/disconnect follow status and capability rules.
- [x] OAuth result is translated and both tabs refresh safely.
