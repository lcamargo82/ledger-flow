# ADR 0037 — Estoque avançado sobre o ledger imutável existente

## Status

Aceito. A 10.2.1 implementa autorização, flags e reason codes; agregados e efeitos no ledger permanecem para 10.2.2–10.2.3.

## Contexto

O módulo Inventory já possui warehouses, movimentos imutáveis, saldo projetado/versionado, reservas e idempotência. Transferências e contagens físicas precisam de documentos de workflow, mas criar outro saldo ou escrever diretamente em `InventoryBalance` quebraria rastreabilidade e sincronização de canais.

## Decisão

- `InventoryTransfer` e `CycleCount` são agregados de workflow.
- Efeitos financeiros/quantitativos continuam exclusivamente em `InventoryMovement` + `InventoryBalance` pelo repository transacional atual.
- Conclusão de transferência cria pares `TRANSFER_OUT/TRANSFER_IN` na mesma transação.
- Aprovação de contagem cria `ADJUSTMENT_IN/OUT` somente após validar snapshot e versão.
- Movimentos usam idempotency keys derivadas do documento/item/operação.
- Eventos `inventory.balance.changed` continuam sendo o gatilho único de sync de canal.

## Consequências

- Não há dupla fonte de verdade.
- Transações podem bloquear brevemente linhas de saldo; itens devem ser ordenados deterministicamente para reduzir deadlock.
- Contagens antigas podem ficar stale e exigir recontagem, priorizando correção sobre conveniência.
- A migration adiciona documentos, relações e índices, sem alterar o significado do ledger existente.
