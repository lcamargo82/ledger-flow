# 11.0.1–11.0.4 Sales Intelligence Core — Pedido, Pagamento, Taxa, Líquido e Estoque

## Goal

Entregar uma visão operacional inspirada na fila de vendas do Mercado Turbo, em `/sales-intelligence`, consolidando somente pedido, pagamento, taxa, valor líquido e situação do estoque por venda Mercado Livre, da 11.0.1 até a 11.0.4, sem antecipar lucro, DRE, frete, settlement detalhado ou analytics avançado da spec completa.

## Scope

### In

- Uma linha por pedido Mercado Livre, com os SKUs agrupados em um drawer de detalhe.
- Data, canal, referência externa e status do pedido.
- Status e valor do pagamento.
- Tarifa/taxa do marketplace.
- Valor líquido com origem explícita: `REALIZED`, `RECONCILED`, `ESTIMATED` ou `UNAVAILABLE`.
- Estado agregado do estoque: `PENDING`, `RESERVED`, `CONSUMED`, `RELEASED`, `DIVERGENT` ou `UNAVAILABLE`.
- Drawer enxuto com SKU, produto, quantidade e estado de estoque por item.
- Filtros por período, referência do pedido, status de pagamento e status de estoque.
- Paginação backend, RBAC/capability, i18n pt-BR/en-US e documentação Swagger/Redoc/OpenAPI.

### Out

- COGS/custo do produto, lucro, margem, DRE e impostos.
- Frete, expedição, etiqueta, DANFE e timeline completa.
- Custo e margem por item no drawer; o contrato deve permitir a evolução sem expor esses campos no Core.
- Cash position, data de liberação, casos de conciliação e malha fina na UI.
- Alertas, Notification Center, n8n, CSV/XLSX e snapshots materializados.
- Curva ABC, ranking por SKU, vendas por estado e novos canais.

## Current-State Findings

- `ChannelOrderIntakeService` já cria `InternalOrder`, reserva/consome estoque e registra o vínculo indireto com o pedido externo.
- `MercadoLivreChannelAdapter` já normaliza bruto/pago, tarifa e dados de pagamento do pedido, mas `paidAmount` não é persistido de forma consultável e o status financeiro do provider não fica explícito no read model.
- `OrderFinancialFact` já guarda receita e taxa, porém trabalha em major units e retorna a versão 1 existente sem refletir mudanças financeiras posteriores do webhook.
- `ProviderSettlementEvent` já guarda bruto, taxa, líquido e status Mercado Pago em minor units; `ReconciliationCase.orderId` fornece o vínculo auditável com o pedido quando o matching 9B existe.
- `InventoryReservation` e `InventoryMovement` já permitem derivar estoque reservado, consumido ou liberado sem criar outro saldo.
- `OrdersView` é uma tela de operação manual; `AnalyticsView` é um agregado financeiro. Misturar a nova fila em qualquer uma delas aumentaria responsabilidades e dificultaria a evolução da spec 11.0.

## Architecture Decisions

1. Criar `SalesIntelligenceModule` como camada de leitura; Orders, Inventory, Financial Intelligence e 9B continuam donos dos seus dados.
2. Usar `InternalOrder` como raiz paginável e somente pedidos com `OrderFinancialFact.channelProvider = MERCADO_LIVRE` nesta primeira entrega.
3. Persistir no fato operacional os campos normalizados que hoje se perdem no intake: status do pagamento, valor pago e líquido esperado, mantendo revisões idempotentes quando o payload financeiro mudar.
4. Resolver valores pela seguinte precedência:
   - `REALIZED`: líquido confirmado/liberado pelo Mercado Pago e ingerido pelo 9B;
   - `RECONCILED`: líquido ligado ao pedido por settlement conciliado;
   - `ESTIMATED`: fato operacional do pedido (`paid/gross - fee`);
   - `UNAVAILABLE`: nunca assumir zero quando a fonte não informou o valor.
5. Derivar o estado do estoque das reservas/movimentos dos itens; não criar saldo, snapshot ou ledger paralelo.
6. Introduzir apenas `sales-intelligence:read` e `sales_intelligence.read` para a fatia; permissões granulares de lucro/settlement ficam para a spec completa.
7. Começar com query aggregation otimizada e índices direcionados; criar snapshot reconstruível somente se o teste de volume demonstrar necessidade.

## API Contract

```text
GET /sales-intelligence
  page, perPage, dateFrom, dateTo, orderReference,
  paymentStatus, stockStatus, sortBy, sortDirection

GET /sales-intelligence/summary
  orderCount, paidAmountMinor, feeAmountMinor, netAmountMinor,
  realizedNetAmountMinor, estimatedNetAmountMinor, stockIssueCount

GET /sales-intelligence/:orderId
  order summary + items[{ sku, product, quantity, stockStatus }]
```

Cada row deve expor strings em minor units e nunca `number` para dinheiro:

```text
orderId, orderNumber, externalOrderId, soldAt, orderStatus
items[{ orderItemId, skuId, sku, productName, quantity }]
paymentStatus, paidAmountMinor
feeAmountMinor
netAmountMinor, netAmountSource
stockStatus
currency
```

## Implementation Tasks

- [x] 1. Importar e recortar a documentação 11.0 para o MVP Core → Verify: PRD/SDD/spec/backlog/ADR deixam explícitos os itens `in/out`, as três fontes de verdade e a precedência do líquido.
- [x] 2. Criar a foundation do módulo, permission/capability, DTOs e endpoints protegidos → Verify: testes de controller/guard cobrem acesso dedicado, tenant vem apenas do usuário autenticado e OpenAPI expõe os contratos paginados.
- [x] 3. Corrigir a persistência financeira do intake Mercado Livre → Verify: testes do adapter/intake persistem status, pago, taxa e líquido esperado; webhook repetido não duplica versão e mudança real cria uma nova revisão idempotente.
- [x] 4. Implementar a query consolidada e o mapper de proveniência financeira → Verify: testes cobrem líquido realizado, fallback estimado, indisponível, refund/cancelamento e match divergente sem N+1.
- [x] 5. Implementar a derivação agregada do estoque → Verify: testes cobrem pedido sem reserva, todos reservados, todos consumidos, todos liberados e itens em estados incompatíveis retornando `DIVERGENT`.
- [ ] 6. Construir a página `/sales-intelligence` com resumo, filtros, fila responsiva e drawer de itens → Verify: teste de componente cobre loading/empty/error, filtros, paginação, badges, abertura do drawer, SKUs/quantidades/estoque e distinção visual entre líquido realizado, conciliado e estimado usando componentes compartilhados.
- [ ] 7. Fechar índices, segurança, docs e validação operacional → Verify: Prisma validate/generate, testes focados API/web, builds, type-check, i18n check e smoke em `/api/docs`, `/api/openapi.json`, `/api/reference` e `/sales-intelligence` passam.

## Suggested Delivery Sequence

```text
11.0.1 — Foundation, contratos, permissões e documentação recortada
11.0.2 — Intake financeiro versionado + query consolidada
11.0.3 — Fila de vendas, resumo, filtros e drawer enxuto de SKUs
11.0.4 — Performance, segurança, OpenAPI/Redoc e smoke E2E
```

A spec anexa completa segue até a 11.0.7. Para este recorte, a entrega termina na 11.0.4. Drawer financeiro completo/timeline, alertas/exportação e o hardening ampliado das antigas 11.0.5–11.0.7 permanecem como evolução posterior, sujeita a uma nova decisão de escopo.

Branches sugeridas, sempre a partir de `develop`:

```text
feature/11-0-1-sales-intelligence-foundation
feature/11-0-2-sales-intelligence-read-model
feature/11-0-3-sales-intelligence-ui
feature/11-0-4-sales-intelligence-hardening
```

Fluxo de integração:

```text
develop
└─ feature/11-0-sales-intelligence (branch base da fase)
   ├─ feature/11-0-1-sales-intelligence-foundation
   ├─ feature/11-0-2-sales-intelligence-read-model
   ├─ feature/11-0-3-sales-intelligence-ui
   └─ feature/11-0-4-sales-intelligence-hardening
```

Cada sprint nasce da branch base e volta para ela com merge `--no-ff`. A branch base só será integrada à `develop` depois da 11.0.4 concluída, documentada e validada.

## Done When

- [ ] Uma venda Mercado Livre aparece uma única vez e mostra pedido, pagamento, taxa, líquido e estoque com fontes rastreáveis.
- [ ] O usuário distingue líquido realizado de estimado; ausência de dado nunca vira zero silenciosamente.
- [ ] Reprocessamento de webhook e sync Mercado Pago não duplica pedido/fato nem baixa estoque duas vezes.
- [ ] Todas as consultas são tenant-scoped, paginadas e sem raw provider payload ou segredo.
- [ ] Componentes reutilizáveis, pt-BR/en-US, Swagger, OpenAPI, Redoc e documentação do sistema estão atualizados.

## Accepted Decisions

### Decision 11.0-D1 — Order-first table

The main Sales Intelligence table will default to one row per order, with SKUs grouped inside the detail drawer. A future item-level view may be added as an advanced toggle.

### Decision 11.0-D2 — Explicit net amount provenance

Realized Mercado Pago net amount has priority. When unavailable, LedgerFlow shows reconciled or estimated net amount with explicit labeling and `netAmountSource` metadata.

### Decision 11.0-D3 — Separate operational and analytical routes

Create `/sales-intelligence` as a read/analytics route. Keep `/orders` as the operational route for manual/internal orders and order operations.
