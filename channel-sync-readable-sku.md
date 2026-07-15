# Channel Sync Readable SKU

## Goal

Replace internal SKU UUIDs in the Channels synchronization table with product name and readable SKU code.

## Tasks

- [x] Enrich the paginated inventory-sync API response with tenant-scoped product/SKU projection.
- [x] Render product name and SKU display code without UUID fallback in the Channels table.
- [x] Update API/web contracts and add regression coverage.
- [x] Run focused tests, type-check, i18n and builds.

## Done When

- [x] The synchronization table shows `Product name` and `SKU-DISPLAY`; internal UUIDs remain hidden.
