# Spec — Plano de Sprints 9A Reconciliation

## Regra

Uma branch e um prompt por sprint:

```text
feature/9a-<identificador>
```

A fase 9A não deve ser renomeada para 8A. A fase 8A representa a confiabilidade assíncrona: Outbox, RabbitMQ, Worker, Retry, DLQ, Replay e AsyncJobExecution. A conciliação usa essa infraestrutura, mas é outro domínio.

## 9A.1 — Foundation, contratos e UI shell

- Módulo reconciliation.
- `ReconciliationCapabilities` e registry central de capabilities.
- Permissões e RBAC.
- Rotas/menu feature-gated.
- Shell UI, badge e empty state.
- Documentar Money Value Object (`amountMinor`, `currency`, `exponent`).
- Documentar relação `WebhookInboxEvent` → `ProviderSettlementEvent`.
- Sem migrations de settlement/case.
- Aceite: tenant MASTER interno acessa; sem capability recebe 403; pt-BR/en-US; menu deixa de ser disabled somente para usuário autorizado.

## 9A.2 — Settlement ingestion e Asaas adapter inicial

- `ProviderSettlementEvent`.
- `sourceWebhookInboxEventId` opcional.
- Adapter Asaas.
- Upsert idempotente por `provider + providerEventId` e, quando existir, `provider + providerSettlementId`.
- Inbox/Outbox/worker/DLQ/replay.
- Resolução segura de tenant.
- Aceite: duplicata não duplica; worker não cai; sync futuro não duplica fato criado por webhook; sem tenant não gera case inválido.

## 9A.3 — Matching automático e cases

- `ReconciliationCase`, `ReconciliationPolicy`.
- Money em minor units persistido nos snapshots do case.
- providerPaymentId, externalReference e candidates.
- reasonCodes.
- Lista/detalhe paginados.
- Aceite: exact match, unmatched, ambiguous e amount divergence funcionam sem alterar Payment.

## 9A.4 — Malha fina e decisões manuais

- `ReconciliationDecision`.
- Match manual, resolve exception, ignore, reopen.
- Timeline, audit e modal reutilizável.
- Aceite: decisões imutáveis, cross-tenant bloqueado, histórico preservado.

## 9A.5 — Policies, tolerâncias e divergências

- CRUD controlado de policies.
- Tolerância versionada em minor units.
- Currency/status divergences.
- Aceite: policy histórica não é reescrita; moeda nunca é tolerada.

## 9A.6 — Dashboard e relatórios

- KPIs, aging, filtros e gráficos.
- Aceite: dados tenant/filter scoped; não confundir margem com caixa conciliado.

## 9A.7 — Exportações pesadas e sync controlado

- ExportJob, CSV via streams, storage temporário.
- XLSX entra como backlog posterior, após CSV, permissões, storage temporário e auditoria estarem validados.
- Sync assíncrono, rate limit, jitter, circuit breaker.
- Aceite: export não usa memória total; retry não duplica settlement.

## 9A.8 — Hardening e fechamento

- E2E, carga, métricas, LGPD, revisão docs/OpenAPI/AsyncAPI.
- Runbook operacional em `docs/runbooks/9A-reconciliation-operational-readiness.md`.
- AsyncAPI cobre `reconciliation.settlement_received` e `reconciliation.sync.completed`.
- OpenAPI documenta o resumo de `POST /reconciliation/sync/asaas`.
- Aceite: replay idempotente, worker resiliente e checklist operacional concluído.
