# Assessment — Spec pós-10.1 versus sistema atual

**Data-base:** 11/07/2026.  
**Objetivo:** impedir que documentação planejada seja confundida com funcionalidade disponível.

| Área | Estado atual | Gap para a spec | Fase |
|---|---|---|---|
| OAuth ML | conexão, state, criptografia, callback, nova aba, feedback e refresh | lock distribuído comprovado e E2E real | 10.1.10 |
| Channel settings | endpoint/modal, warehouse tenant-safe e sync settings entregues | homologação E2E | 10.1.10 |
| Listing import | adapter real e malha fina existem | ação/feedback/operacionalização | 10.1.10 |
| Channel health | projeção sanitizada e ações por estado entregues | métricas/E2E operacional | 10.1.10 |
| Notifications | apenas toast frontend | domínio event/recipient/audience/feed | 10.2.0A |
| n8n outbound | não identificado como entrega durável | subscription, HMAC, delivery, retry/DLQ | 10.2.0B |
| Inventory base | warehouse, ledger, balance versionado, reservas | capabilities/reason registry avançados | 10.2.1 |
| Transfers | tipos OUT/IN já existem | documento, workflow, API/UI, transação pareada | 10.2.2 |
| Cycle counts | não identificado | schema/workflow/snapshot/aprovação/UI | 10.2.3 |
| ML financial | fatos operacionais parciais | normalização/revisão/timeline | 10.1.11 |
| ML shipping | summary persistido não identificado | modelo/adapter/UI/eventos | 10.1.11 |
| 9A | implementação e docs existem | homologação/dívida documental | antes de 9B |
| 9B/10.3 | somente visão | discovery e especificação futura | futuro |

## Ajustes na spec original

1. `defaultWarehouseId` permanece coluna; JSON não duplica FK.
2. Import de listings não exige warehouse; intake de pedido exige.
3. Transfer/count reutilizam ledger/balance existentes.
4. Notification authorization ocorre na criação e leitura.
5. Feed inicial usa cursor/polling; WebSocket depende de medição.
6. Outbound n8n virou 10.2.0B por exigir operação própria.
7. Swagger/Redoc/AsyncAPI representam apenas código entregue.

## Riscos

- Lint global possui dívida; cada sprint não aumenta baseline e corrige arquivos tocados.
- Refresh ML requer teste concorrente multi-processo/lock distribuído antes do fechamento.
- n8n exige política de PII, retenção e rotação de segredo.
- Operações multi-item exigem locks em ordem determinística e teste de rollback/deadlock.
