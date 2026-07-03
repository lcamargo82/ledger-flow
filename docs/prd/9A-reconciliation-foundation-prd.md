# PRD — 9A Reconciliation Foundation

**Status:** Proposto  
**Provider inicial:** Asaas  
**Fora do escopo inicial:** contabilidade, fiscal, conciliação bancária/OFX, contas a pagar, chargeback completo, antecipação, split e exportação XLSX.

## 1. Visão

A conciliação deve responder:

```text
Quanto o LedgerFlow esperava receber?
Qual fato o provider informou?
Há vínculo confiável entre ambos?
Existe divergência de valor, moeda, status ou referência?
Qual decisão humana foi tomada e por quê?
```

## 2. Escopo

### É

- Eventos/settlements normalizados por provider.
- Matching automático explicável.
- Malha fina e decisões manuais auditáveis.
- Tolerâncias por tenant/provider/moeda.
- Dashboard, relatórios e exportações CSV assíncronas via streams.
- Reuso de Inbox/Outbox, RabbitMQ, retry, DLQ e replay da fase 8A.
- Componentização e i18n pt-BR/en-US.

### Não é

- Alterar `Payment.status` para esconder divergência.
- Editar fatos externos.
- Expor payload bruto, tokens ou URLs sensíveis.
- Substituir Payments, Orders ou Financial Intelligence.
- Prometer XLSX no aceite inicial; XLSX fica para backlog posterior após validar CSV, permissões, storage temporário e auditoria.

## 3. Princípios

1. Conciliação não é pagamento.
2. 8A é infraestrutura assíncrona; 9A é domínio de conciliação que usa essa infraestrutura.
3. Decisões manuais são append-only e auditáveis.
4. Automação precisa registrar a regra usada.
5. Divergência pode ser fato de negócio, não erro técnico.
6. Backend decide RBAC + capability.
7. Eventos externos são idempotentes.
8. Provider usa adapter; o domínio não depende de payload externo.
9. UI usa componentes reutilizáveis e i18n.
10. Valores financeiros conciliáveis são comparados em unidade mínima (`amountMinor`), nunca em `number`.

## 4. Acesso

Capabilities:

```text
reconciliation.read
reconciliation.manage
reconciliation.export
reconciliation.sync
```

Permissões:

```text
reconciliation:read
reconciliation:manage
reconciliation:export
reconciliation:sync
```

Acesso operacional:

```text
tenant correto + RBAC + entitlement
```

Platform Owner administra saúde e replay técnico sanitizado; não edita dados financeiros detalhados de tenants clientes.

As capabilities devem ficar em um grupo próprio (`ReconciliationCapabilities`) e ser registradas em um registry central junto das capabilities comerciais, reutilizando o `CapabilityGuard` existente.

## 5. Requisitos funcionais

### RF9A.1 — Ingestão

- Webhook e sync controlado via adapter.
- `WebhookInboxEvent` registra a entrada técnica do webhook: autenticação, idempotência, payload hash, status de processamento e replay.
- `ProviderSettlementEvent` registra o fato financeiro normalizado para conciliação: provider, eventId, settlementId, providerPaymentId, externalReference, valores, moeda, status e datas.
- `ProviderSettlementEvent.sourceWebhookInboxEventId` deve apontar opcionalmente para o inbox técnico que originou o fato.
- Idempotência por `provider + providerEventId` no inbox e no settlement event; quando providerSettlementId existir, sync/polling também deve usar essa chave de negócio para upsert.
- Dados sensíveis não aparecem em UI/log/audit.

### RF9A.2 — Expectativa interna

- Payment é a expectativa principal quando existir.
- Order fornece contexto comercial opcional.
- Capturar expected amount, moeda, referências, status e datas.
- Não alterar expectativa para mascarar divergência.
- `Payment.amount` atual continua em centavos; Reconciliation persiste snapshots em minor units.

### RF9A.3 — Money e comparação canônica

- Normalizadores de provider usam Decimal.js ou equivalente para parsing preciso.
- O domínio compara sempre:

```text
expectedAmountMinor
receivedAmountMinor
differenceAmountMinor
currency
currencyExponent
```

- Exemplos:

```text
Payment.amount = 12345, currency = BRL
→ expectedAmountMinor = 12345, exponent = 2

Asaas value = 123.45
→ receivedAmountMinor = 12345, exponent = 2
```

- Não usar `number` para cálculo monetário.
- Persistência recomendada: `BigInt`/`BIGINT` se a infraestrutura Prisma estiver confortável; caso contrário `Decimal(18,0)` sem casas decimais.

### RF9A.4 — Matching automático

Ordem obrigatória:

```text
1. providerPaymentId exato
2. provider + externalReference exata
3. vínculo explícito pré-existente
4. valor + moeda + janela temporal: apenas candidato para revisão
```

Estados:

```text
PENDING
AUTO_MATCHED
MANUALLY_MATCHED
RECONCILED
UNMATCHED
AMBIGUOUS
AMOUNT_DIVERGENCE
CURRENCY_DIVERGENCE
STATUS_DIVERGENCE
IGNORED
RESOLVED_EXCEPTION
```

### RF9A.5 — Malha fina

Usuário autorizado pode:

- vincular manualmente;
- resolver exceção;
- ignorar com motivo;
- reabrir;
- solicitar sync;
- adicionar comentário operacional.

Toda ação exige reasonCode e gera AuditLog + decisão imutável.

### RF9A.6 — Tolerâncias

- Configuração por tenant/provider/moeda.
- Versionada.
- Nunca resolve diferença de moeda.
- Case registra a policyVersion aplicada.
- Tolerância opera em minor units para a moeda configurada.

### RF9A.7 — Dashboard e exportação

KPIs:

```text
esperado, conciliado, pendente, divergente,
aging, valores por provider, contagem por status
```

Exportações CSV devem usar streams, jobs assíncronos, storage temporário e auditoria. XLSX permanece backlog posterior.

## 6. Não funcionais

- UTC persistido.
- Paginação/filtros/ordenação no backend.
- traceId API → outbox → RabbitMQ → worker.
- LGPD, logs sanitizados, sem cross-tenant.
- Testes unitários, integração, E2E e carga.
