# ADR 0034 — Domínio de Conciliação e Estratégia de Matching

**Status:** Accepted  
**Data:** 2026-07-02

## Contexto

A fase 8A representa a confiabilidade assíncrona do LedgerFlow: Outbox, RabbitMQ, Worker, Retry, DLQ, Replay e AsyncJobExecution. A conciliação financeira depende dessa base, mas precisa de um domínio próprio para modelar fatos externos, matching, divergências e decisões humanas auditáveis.

O projeto já possui `WebhookInboxEvent` para registrar entradas técnicas de webhooks de pagamento. Esse registro não deve ser confundido com o fato financeiro conciliável.

## Decisão

Criar módulo Reconciliation separado de Payments e Financial Intelligence.

- `WebhookInboxEvent` é o registro técnico de entrada do webhook: autenticação, idempotência, payload hash, processamento assíncrono e replay.
- `ProviderSettlementEvent` é o fato financeiro normalizado/idempotente para conciliação.
- `ProviderSettlementEvent.sourceWebhookInboxEventId` referencia opcionalmente o inbox técnico que originou o fato.
- Sync/polling futuro deve fazer upsert por chave de negócio estável e não duplicar fatos criados por webhook.
- `ReconciliationCase` armazena o resultado/processo por tenant.
- `ReconciliationDecision` é append-only.
- Matching: providerPaymentId → externalReference → explicit link → amount/currency/time como candidato para revisão.
- Valores conciliáveis usam Money em minor units: `amountMinor`, `currency`, `exponent`.
- `Payment.amount` permanece como inteiro em centavos; Reconciliation persiste snapshots normalizados em minor units.
- Normalizadores de provider usam Decimal.js ou equivalente para converter valores externos sem `number`.
- Divergências são estados explícitos; não alteram silenciosamente o Payment.
- Tolerâncias são policies versionadas em minor units.
- Asaas é o primeiro provider via adapter.
- Capabilities de conciliação ficam em grupo próprio (`ReconciliationCapabilities`) e reutilizam o `CapabilityGuard`.
- CSV assíncrono via streams faz parte do caminho inicial; XLSX fica para backlog posterior.

## Consequências

Positivas:

- Separação clara entre infraestrutura técnica, fato financeiro e processo de matching.
- Explicabilidade, auditoria, suporte multi-provider e separação correta entre margem e recebimento conciliado.
- Evita dupla ingestão entre webhook e sync/polling.
- Evita erros de precisão monetária ao comparar sempre em unidade mínima.

Negativas:

- Mais entidades, estados, jobs e UX de exceção.
- Exige registry central de capabilities para evitar acoplamento com CommerceCapabilities.
- Exige disciplina de conversão monetária nos adapters.

## Alternativas rejeitadas

- Colocar campos de conciliação diretamente em Payment.
- Usar `WebhookInboxEvent` como case financeiro.
- Match automático apenas por valor/data.
- Comparar inteiro local com decimal externo diretamente.
- Editar fato externo.
- Decisão manual sem histórico.
- Colocar capabilities de conciliação dentro de CommerceCapabilities.
