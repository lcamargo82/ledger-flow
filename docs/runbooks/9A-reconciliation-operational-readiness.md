# Runbook — 9A Reconciliation Operational Readiness

## Objetivo

Fechar a fase 9A com critérios operacionais claros para conciliação financeira: ingestão idempotente, worker resiliente, exportação CSV assíncrona, sync controlado, payloads sanitizados e contratos OpenAPI/AsyncAPI revisados.

## Escopo Validado

- `WebhookInboxEvent` registra a entrada técnica do webhook.
- `ProviderSettlementEvent` registra o fato financeiro normalizado.
- `sourceWebhookInboxEventId` mantém rastreabilidade quando o fato veio de webhook.
- Matching cria `ReconciliationCase` por tenant sem alterar `Payment`.
- Decisões manuais são append-only em `ReconciliationDecision`.
- Policies versionadas preservam histórico de tolerância em minor units.
- Exportação inicial é CSV via streams; XLSX permanece backlog.
- Sync usa adapter, limite de páginas, jitter, circuit breaker e ingestão idempotente.

## Checklist Go/No-Go

| Área | Critério | Evidência |
|---|---|---|
| Replay | Reprocessar `reconciliation.settlement_received` não cria case duplicado | `ReconciliationMatchingService.matchSettlement` consulta `tenantId + settlementEventId` antes de criar |
| Ingestão | Webhook/sync duplicado não cria settlement/outbox duplicado | `ReconciliationSettlementIngestionService.ingestNormalizedSettlement` usa `provider + providerEventId` |
| Worker | Falha do matching não é engolida | handler retorna a Promise do matching para a infraestrutura 8A aplicar retry/DLQ |
| Exportação | CSV não carrega todos os cases em memória | `ExportJobsService` pagina por cursor e escreve em stream |
| Sync | Provider instável abre circuito | `ReconciliationSyncService` registra `reconciliation.sync.circuit_opened` e `nextAttemptAt` |
| LGPD | Payload financeiro normalizado é allowlist | adapter Asaas persiste apenas campos sanitizados e registra `redactedFields` |
| OpenAPI | Endpoint de sync tem DTO de resposta | `ReconciliationSyncResponseDto` em `POST /reconciliation/sync/asaas` |
| AsyncAPI | Eventos de conciliação estão documentados | `docs/asyncapi.yaml` contém `reconciliation.settlement_received` e `reconciliation.sync.completed` |

## Métricas Operacionais

- Settlements recebidos por provider.
- Settlements criados versus duplicados.
- Cases por status: `RECONCILED`, `UNMATCHED`, `AMBIGUOUS`, `AMOUNT_DIVERGENCE`, `CURRENCY_DIVERGENCE`, `STATUS_DIVERGENCE`.
- Tempo entre `ProviderSettlementEvent.receivedAt` e criação do `ReconciliationCase`.
- Taxa de retry/DLQ do handler `ReconciliationSettlementReceivedAsyncHandler`.
- Syncs concluídos, circuitos abertos e `nextAttemptAt`.
- Export jobs por status e tempo de geração.

## Operação de Replay

1. Confirmar que o evento original existe no outbox/replay técnico da fase 8A.
2. Reexecutar apenas eventos sanitizados e do tenant correto.
3. Validar que `ProviderSettlementEvent` não duplicou por `provider + providerEventId`.
4. Validar que `ReconciliationCase` não duplicou por `tenantId + settlementEventId`.
5. Conferir audit log quando houver decisão manual ou sync.

## Operação de Sync

1. Acionar `POST /reconciliation/sync/asaas` com `reconciliation:sync` e capability `reconciliation.sync`.
2. Usar `maxPages` baixo para execução manual inicial.
3. Em `circuitOpened = true`, aguardar `nextAttemptAt` antes de nova tentativa.
4. Validar contadores `received`, `created` e `duplicates`.
5. Conferir evento `reconciliation.sync.completed` quando a execução terminar sem abrir circuito.

## LGPD e Auditoria

- Não persistir payload bruto de provider em `ProviderSettlementEvent.normalizedPayload`.
- Não registrar tokens, authorization headers, dados completos de cliente, cartão ou endereço em audit log.
- Usar `payloadHash` para rastreabilidade técnica.
- Usar `redactedFields` para indicar sanitização sem expor o conteúdo removido.

## Documentação

- OpenAPI: `/api/openapi.json`, Swagger e Redoc via decorators Nest.
- AsyncAPI: `docs/asyncapi.yaml`.
- PRD: `docs/prd/9A-reconciliation-foundation-prd.md`.
- SDD: `docs/sdd/9A-reconciliation-foundation-sdd.md`.
- ADR: `docs/adr/0034-reconciliation-domain-and-matching-strategy.md`.

## Status 9A.8

`REC-016` fica concluído quando os testes focados de conciliação, `prisma validate`, build backend e `git diff --check` passam na branch da sprint.
