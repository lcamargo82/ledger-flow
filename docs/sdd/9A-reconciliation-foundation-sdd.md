# SDD — 9A Reconciliation Foundation

## 1. Fronteiras

```text
payments → ciclo do Payment
orders → contexto comercial
financial-intelligence → margem operacional
async foundation (8A) → Outbox, RabbitMQ, Worker, Retry, DLQ, Replay, AsyncJobExecution
reconciliation (9A) → fatos externos, matching, cases e decisões
```

Reconciliation não reescreve Payment para “corrigir” divergência.

## 2. Estrutura

```text
apps/api/src/modules/reconciliation/
├─ application/{dto,services,use-cases,policies,value-objects}
├─ domain/{entities,enums,interfaces,value-objects}
├─ infra/{adapters,repositories,async-handlers,mappers}
├─ presentation/{controllers,guards}
└─ reconciliation.module.ts

apps/web/src/
├─ views/reconciliation/
├─ components/reconciliation/
├─ services/reconciliation/
└─ locales/
```

## 3. Entidades

### ProviderSettlementEvent

Fato externo imutável e normalizado.

Campos mínimos:

```text
tenantId nullable
provider
providerEventId
providerSettlementId nullable
providerPaymentId
externalReference
eventType
providerStatus
amountMinor
feeAmountMinor
netAmountMinor
currency
currencyExponent
occurredAt
availableAt
payloadHash
normalizedPayload sanitizado
sourceWebhookInboxEventId nullable
receivedAt
```

Índices:

- único: provider + providerEventId;
- único parcial recomendado quando existir: provider + providerSettlementId;
- provider + providerPaymentId;
- provider + externalReference;
- tenantId + provider + occurredAt.

`sourceWebhookInboxEventId` preserva rastreabilidade com `WebhookInboxEvent`, mas sync/polling futuro não depende dele e deve fazer upsert por chave de negócio estável.

### ReconciliationCase

Representa o processo de matching para um settlement dentro de um tenant.

```text
tenantId
provider
status
matchType
settlementEventId
paymentId nullable
orderId nullable
expectedAmountMinor
receivedAmountMinor
differenceAmountMinor
currency
currencyExponent
policyVersion
matchedAt
reconciledAt
```

Único: tenantId + settlementEventId.

### ReconciliationDecision

Append-only:

```text
tenantId
reconciliationCaseId
type
reasonCode
comment
previousStatus
nextStatus
performedByUserId
createdAt
```

### ReconciliationPolicy

```text
tenantId
provider nullable
currency
currencyExponent
amountToleranceMinor
version
isActive
```

## 4. Money Value Object

Criar um value object centralizado:

```text
Money
amountMinor
currency
exponent
```

Regras:

- `Payment.amount` continua como inteiro em centavos no domínio atual.
- Reconciliation persiste valores em minor units.
- Normalizadores externos usam Decimal.js para converter valores decimais de provider para minor units.
- Comparações usam `expectedAmountMinor`, `receivedAmountMinor` e `differenceAmountMinor`.
- Não usar `number` para cálculo monetário.
- Persistência recomendada: `BigInt`/`BIGINT` se validado no Prisma; fallback aceito: `Decimal(18,0)`.

## 5. Adapter

```ts
interface IReconciliationProviderAdapter {
  provider: string;
  normalizeWebhook(input: unknown): NormalizedSettlementEvent | null;
  fetchSettlements(input: SyncInput): Promise<ProviderSettlementPage>;
  supportsSettlementSync(): boolean;
}
```

Asaas será o primeiro adapter.

## 6. Fluxo

```text
Webhook Asaas
→ WebhookInboxEvent criado uma única vez
→ Worker processa o Inbox
→ adapter normaliza evento financeiro
→ ProviderSettlementEvent upsert idempotente
→ OutboxEvent reconciliation.settlement_received
→ RabbitMQ
→ Matching Engine
→ ReconciliationCase
→ AuditLog + métricas
```

Sem tenant seguro:

```text
evento técnico/orphaned
→ ProviderSettlementEvent sem case tenant-scoped inválido
→ apenas visão técnica sanitizada para Platform Admin
```

Sync/polling futuro:

```text
Provider API
→ adapter fetchSettlements
→ ProviderSettlementEvent upsert por providerEventId ou providerSettlementId
→ não duplica fato criado por webhook
```

## 7. Matching

Ordem:

```text
providerPaymentId
→ externalReference
→ explicit link
→ amount + currency + time como candidato apenas
```

- Moeda diferente: CURRENCY_DIVERGENCE.
- Valor fora da tolerância: AMOUNT_DIVERGENCE.
- Status incompatível: STATUS_DIVERGENCE.
- Sem candidato: UNMATCHED.
- Muitos candidatos: AMBIGUOUS.
- Match aderente: RECONCILED.
- Match confiável que exige revisão: AUTO_MATCHED.

## 8. Authorization

Capabilities próprias:

```ts
export const ReconciliationCapabilities = {
  Read: 'reconciliation.read',
  Manage: 'reconciliation.manage',
  Export: 'reconciliation.export',
  Sync: 'reconciliation.sync',
} as const;
```

Elas devem ser registradas em um registry central de capabilities e avaliadas pelo mesmo `CapabilityGuard` já existente.

## 9. APIs iniciais

```text
GET  /reconciliation/cases
GET  /reconciliation/cases/:id
POST /reconciliation/cases/:id/manual-match
POST /reconciliation/cases/:id/resolve-exception
POST /reconciliation/cases/:id/ignore
POST /reconciliation/cases/:id/reopen
POST /reconciliation/sync
GET  /reconciliation/policies
PUT  /reconciliation/policies/:id
POST /reconciliation/exports
```

Todas exigem RBAC + capability.

## 10. Observabilidade

Métricas:

```text
settlement_ingested_total
cases_total_by_status
match_duration_ms
unmatched_total
divergence_total_by_type
manual_decision_total
sync_duration_ms
provider_rate_limit_total
dlq_total
```
