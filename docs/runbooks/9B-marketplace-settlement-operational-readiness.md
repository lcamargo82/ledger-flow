# Runbook — 9B Marketplace Settlement operational readiness

## Scope

Validate the LedgerFlow-controlled marketplace settlement path after Mercado Pago payment readiness is complete.

This runbook covers financial account setup, Mercado Pago financial sync, ML x MP matching, fine mesh decisions, Notification Center/n8n outbound, CSV exports and sanitized health. It does not certify official accounting, card checkout, payout accounting or scheduled sync.

## Preconditions

- Mercado Pago connection shows settlement-ready financial readiness.
- Mercado Livre operational orders/facts exist when testing ML x MP matching.
- Worker is running for outbox and notification webhook deliveries.
- Notification webhook subscription is active for:
  - `marketplace_settlement.event_received`
  - `cash_position.unexplained_difference`
- n8n consumer validates `X-LedgerFlow-Signature` and dedupes `Idempotency-Key`.

## Evidence matrix

| Area | Expected evidence | Safety check |
| --- | --- | --- |
| Financial account | Account created with opening balance and append-only ledger | no tokens or raw credentials in response/audit |
| Financial sync | new `ProviderSettlementEvent` rows and `marketplace_settlement.event_received` notifications | duplicates do not emit duplicate notifications |
| Matching | reconciliation cases are tenant-scoped and explicit about divergence | no cross-tenant case/payment/order link |
| Fine mesh | decisions are append-only with controlled reason codes | no decision rewrites history |
| n8n outbound | HMAC signature valid and `Idempotency-Key` persisted before effects | n8n receives normalized LedgerFlow payload only |
| CSV export | `RECONCILIATION_CASES` and `MARKETPLACE_SETTLEMENT_EVENTS` jobs complete and download | CSV has no provider raw payload or secret |
| Health | `GET /health/settlement` returns aggregate status and counters | no tenant ids, provider payloads or tokens |

## Smoke sequence

1. Create or select a settlement-ready Mercado Pago financial account in `/marketplace-settlement`.
2. Run manual sync for a small date window.
3. Confirm imported totals and imported events in the UI.
4. Open `/reconciliation`, review generated cases, open the fine-mesh modal and record one comment/decision with a valid reason code.
5. Confirm Notification Center contains settlement/divergence alerts for authorized users.
6. Confirm n8n receives `marketplace_settlement.event_received` with HMAC headers and a deduplicable `Idempotency-Key`.
7. Create CSV exports:
   - `RECONCILIATION_CASES`
   - `MARKETPLACE_SETTLEMENT_EVENTS`
8. Process export queue, download both files and confirm row counts.
9. Call `GET /health/settlement` and archive the sanitized response.

## Rollback boundaries

- Disable outbound subscriptions before disabling financial sync if downstream automations are misbehaving.
- Stop manual financial sync by removing settlement readiness or suspending the gateway connection.
- Existing settlement events, cash ledger entries, reconciliation cases and decisions are audit records and should not be deleted for rollback.
- Failed exports can be regenerated; downloaded CSV files expire according to `ExportJob.expiresAt`.

## Done criteria

- No raw Mercado Pago payload, OAuth token, webhook secret or n8n secret appears in UI, logs, audit metadata, notification payloads, CSV exports or health responses.
- Duplicate sync/webhook/replay does not duplicate settlement events, cases, decisions or outbound deliveries.
- Any unresolved divergence is visible in reconciliation/fine mesh and does not masquerade as official accounting.
