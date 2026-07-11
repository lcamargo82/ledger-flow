# ADR 0038 — Fronteira entre fatos operacionais, settlement 9B e fulfillment 10.3

## Status

Proposto para 10.1.11.

## Contexto

Pedidos Mercado Livre podem fornecer taxas, descontos, frete e resumo logístico. Esses dados são úteis antes do payout e da expedição completa, mas não provam liquidação financeira nem substituem um WMS.

## Decisão

- 10.1.11 normaliza fatos financeiros operacionais e `OrderShippingSummary`.
- Valores usam Decimal/minor units e identificadores externos permanecem string.
- UI nomeia a seção “Resumo financeiro operacional”, nunca “conciliado”.
- 9B será dona de payout, repasse e divergência efetivamente liquidada.
- 10.3 será dona de etiqueta, picking, packing, postagem e SLA logístico avançado.
- Notification Center recebe eventos normalizados e n8n consome somente outbound DTO sanitizado.

## Consequências

- Um pedido poderá ter fato operacional antes de settlement.
- `confidence`/`source` deixam explícita a qualidade do dado.
- Alterações do provider geram upsert idempotente e timeline, não sobrescrita silenciosa sem audit.
