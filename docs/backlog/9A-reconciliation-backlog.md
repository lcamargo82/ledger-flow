# Backlog — 9A Reconciliation

| ID | Sprint | Item | Aceite |
|---|---:|---|---|
| REC-001 | 9A.1 | módulo/capabilities | RBAC + entitlement |
| REC-002 | 9A.1 | shell UI + i18n | rota/menu protegidos |
| REC-003 | 9A.1 | Money Value Object documentado | comparação em minor units |
| REC-004 | 9A.1 | contrato WebhookInboxEvent → ProviderSettlementEvent | separação técnica/financeira explícita |
| REC-005 | 9A.2 | ProviderSettlementEvent | normalizado/idempotente |
| REC-006 | 9A.2 | Asaas adapter | sem payload secreto |
| REC-007 | 9A.3 | ReconciliationCase | tenant-safe |
| REC-008 | 9A.3 | matching engine | providerPaymentId primeiro |
| REC-009 | 9A.3 | lista/detalhe | paginação e filtros |
| REC-010 | 9A.4 | Decision append-only | auditável |
| REC-011 | 9A.4 | malha fina | vínculo manual seguro |
| REC-012 | 9A.5 | policies | tolerância versionada em minor units |
| REC-013 | 9A.6 | dashboard | KPIs corretos |
| REC-014 | 9A.7 | export CSV | streams/audit |
| REC-015 | 9A.7 | sync | rate-limit/retry |
| REC-016 | 9A.8 | hardening | runbook operacional, LGPD, OpenAPI/AsyncAPI e validações finais |

## Futuro

- Exportação XLSX.
- OFX e conciliação bancária.
- Chargeback/disputas.
- Antecipação/split.
- Integração Mercado Pago settlement.
- Integração contábil.
