# 9B-6 Notifications and n8n

## Goal
Publish marketplace settlement alerts through the existing Notification Center and HMAC-signed outbound webhook pipeline.

## Tasks
- [x] Register settlement notification contracts → Verify registry tests expose event types and visibility rules.
- [x] Add producer methods for settlement received, divergence and cash difference alerts → Verify producer tests create sanitized, idempotent events.
- [x] Wire marketplace sync and reconciliation matching to producers → Verify service tests call producers only for new/meaningful facts.
- [x] Update docs and translations → Verify docs mention 9B-6 status and no raw provider payload/token is exposed.
- [x] Run focused API validation → Verify notification/reconciliation/marketplace tests and API build pass.

## Done When
- [x] n8n can subscribe to settlement events through existing outbound webhook subscriptions.
- [x] Events are tenant-scoped, permission-aware, HMAC-signed by existing delivery executor and idempotent.
- [x] README, PRD, SDD, backlog and sprint plan are updated.
