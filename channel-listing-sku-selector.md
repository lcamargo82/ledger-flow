# Channel Listing SKU Selector

## Goal

Let operators map listings by product name/readable SKU while keeping UUIDs internal and tenant-scoped.

## Tasks

- [x] Enrich listing candidates with readable product/SKU data in the API response.
- [x] Replace the raw SKU ID input with catalog search and a readable selection control.
- [x] Keep mapping failures inside the modal and preserve the Channels page.
- [x] Add API/UI regression coverage for readable identities and error behavior.
- [x] Run focused tests, lint, type-check, i18n and builds.

## Done When

- [x] Operators can select `Product name · SKU` without seeing or typing UUIDs.
- [x] Invalid mapping feedback does not replace the Channels page.
