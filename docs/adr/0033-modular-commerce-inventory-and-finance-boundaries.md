# ADR 0033 — Modularização de Commerce, Inventory e Financial Intelligence

**Status:** Accepted  
**Data:** 2026-07-01

## Contexto

LedgerFlow evolui de plataforma de pagamentos para backoffice ERP omnichannel. Catálogo, estoque, pedidos, integrações de canal e fatos financeiros possuem ciclos de mudança diferentes e podem ser vendidos em planos distintos.

## Decisão

Adotar um monólito modular com bounded contexts explícitos:

- Catalog
- Inventory
- Orders
- Channels
- Financial Intelligence
- Payments
- Reconciliation

Entitlements de plano serão avaliados no backend como capabilities. Não haverá cópia de dados, schema por plano ou lógica de domínio duplicada.

Estoque usará ledger imutável + projeção de saldo. Saldo físico, reservado e disponível serão separados. Integrações de canais serão adapter-based, orientadas a Inbox/Outbox, RabbitMQ, idempotência e rate-limited egress.

Financeiro operacional por pedido será separado de pagamentos e conciliação de caixa.

## Consequências

### Positivas

- Permite plano ERP Basic, Commerce e Master.
- Evita acoplamento forte entre marketplace, estoque e pagamentos.
- Mantém rastreabilidade e segurança de concorrência.
- Prepara extração futura de módulos sem exigir microservices agora.

### Negativas

- Mais contratos/eventos e disciplina de fronteiras.
- Alguns dados serão projetados para leitura em mais de um módulo.
- Requer manutenção de entitlements e testes de autorização.

## Alternativas rejeitadas

- Um módulo único `erp` com acesso direto a todas as tabelas.
- Banco/schema diferente por plano.
- Atualizar estoque como campo mutável sem ledger.
- Acoplar pedido de marketplace diretamente ao gateway de pagamentos interno.
