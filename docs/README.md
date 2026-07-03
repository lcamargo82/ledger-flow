# LedgerFlow — Documentação dos Programas 9A e 10.0

## Programa 9A — Conciliação Financeira

A fase 9A cria o domínio de conciliação financeira. Ela usa a infraestrutura assíncrona da fase 8A, mas não faz parte dela.

```text
8A — confiabilidade assíncrona
→ Outbox, RabbitMQ, Worker, Retry, DLQ, Replay, AsyncJobExecution

9A — conciliação financeira
→ settlement real, matching, divergências, decisions e malha fina
```

Arquivos do programa:

```text
docs/
├─ prd/9A-reconciliation-foundation-prd.md
├─ sdd/9A-reconciliation-foundation-sdd.md
├─ specs/9A-reconciliation-components-i18n.md
├─ specs/9A-reconciliation-sprint-plan.md
├─ backlog/9A-reconciliation-backlog.md
├─ runbooks/9A-reconciliation-operational-readiness.md
└─ adr/0034-reconciliation-domain-and-matching-strategy.md
```

Decisões de escopo inicial:

- WebhookInboxEvent permanece como registro técnico de entrada; ProviderSettlementEvent será o fato financeiro normalizado da conciliação.
- ProviderSettlementEvent terá `sourceWebhookInboxEventId` opcional para rastreabilidade.
- Valores conciliáveis serão comparados em unidade mínima (`amountMinor`), não em `number`.
- CSV assíncrono via streams entra no aceite inicial; XLSX fica no backlog posterior.
- Capabilities de conciliação ficam em grupo próprio, reutilizando o CapabilityGuard existente.
- A 9A.8 fecha o fluxo com checklist operacional em `docs/runbooks/9A-reconciliation-operational-readiness.md`, OpenAPI revisado e AsyncAPI para `reconciliation.settlement_received` e `reconciliation.sync.completed`.

Este pacote organiza a evolução do LedgerFlow para uma plataforma ERP omnichannel, sem transformar a primeira implementação em um módulo monolítico excessivamente grande.

## Decisão de produto

O produto será composto por **módulos independentes comercialmente**, que compartilham uma plataforma comum:

```text
LedgerFlow Platform Core
├─ Identity, tenant, RBAC, auditoria, i18n, exportações, observabilidade
├─ Finance / Payments
├─ Commerce Core
│  ├─ Catalog
│  ├─ Inventory
│  ├─ Orders
│  ├─ Channel Integrations
│  └─ Financial Intelligence
└─ Platform Admin / Entitlements
```

Isso permite ofertas diferentes sem quebrar a integração entre módulos:

```text
Plano ERP Basic
→ Catálogo + Estoque + Movimentações + Pedidos internos

Plano Commerce
→ ERP Basic + Integrações omnichannel + sincronização de anúncios/pedidos

Plano Master
→ Commerce + Payments + Financeiro/Conciliação + Analytics avançado
```

**Regra importante:** precificação/entitlement controla acesso a capacidades; não cria bancos, entidades ou regras de domínio paralelas. Os módulos continuam interoperáveis por contratos e eventos explícitos.

## Onde colocar os arquivos no repositório

Copie os arquivos deste pacote para:

```text
docs/
├─ prd/
│  └─ 10.0-commerce-inventory-foundation-prd.md
├─ sdd/
│  └─ 10.0-commerce-inventory-foundation-sdd.md
├─ specs/
│  ├─ 10.0-modular-packaging-and-entitlements.md
│  └─ 10.0-sprint-plan.md
├─ backlog/
│  └─ 10.0-commerce-inventory-backlog.md
└─ adr/
   └─ 0033-modular-commerce-inventory-and-finance-boundaries.md
```

Se as pastas ainda não existirem:

```bash
mkdir -p docs/{prd,sdd,specs,backlog,adr}
```

## Ordem recomendada

```text
10.0.1 — Commerce domain foundation, feature entitlements e contratos
10.0.2 — Catálogo, produto pai/filho, SKU e custo
10.0.3 — Warehouses e ledger de movimentações de estoque
10.0.4 — Reservas administrativas, liberação e consumo total de estoque
10.0.5 — Pedido interno reutilizando reserve/release/consume
10.0.6 — Inbound channel webhooks / order intake foundation
10.0.7 — Malha fina de anúncios e vínculo SKU
10.0.8 — Egress sync, rate limiting, circuit breaker e observabilidade
10.0.9 — Financial facts de pedidos e analytics inicial
10.0.10 — Exportações pesadas
```

## Status de implementação

```text
10.0.1 — Implementada nesta branch
```

A implementação inicial criou os módulos Nest vazios, endpoints foundation documentados no Swagger/Redoc/OpenAPI, `CapabilityGuard`, `@RequireCapabilities`, permissões iniciais no seed e rota `/inventory` no frontend com i18n pt-BR/en-US.

Não foram criadas entidades de produto, estoque ou pedido nesta sprint. Esses itens começam em 10.0.2 e 10.0.3.

A integração com Mercado Livre deve começar somente após 10.0.1–10.0.6 estarem estáveis. O retorno à fase 9A de conciliação financeira continua planejado após a fundação operacional inicial, antes de funcionalidades financeiras mais profundas.

## Princípios que não podem ser quebrados

- `tenantId` é sempre derivado da sessão/claims no backend.
- Estoque não é editado como saldo solto: toda alteração gera uma movimentação imutável.
- Produtos pai não carregam estoque; variantes/SKUs vendáveis carregam estoque.
- Saldo disponível, reservado e físico são conceitos diferentes.
- Webhooks respondem rápido; enriquecimento e efeitos de estoque ocorrem assincronamente.
- Eventos externos são idempotentes.
- Valores monetários usam `Decimal`, nunca `number`.
- Datas de domínio e eventos são persistidas em UTC.
- Segredos de canais são criptografados e nunca aparecem em logs/auditoria/UI.
- Toda UI e erro de domínio utiliza i18n pt-BR/en-US.
