# Spec — Componentização Reutilizável e i18n da Conciliação

## Componentes

```text
components/reconciliation/
├─ ReconciliationStatusBadge.vue
├─ ReconciliationProviderBadge.vue
├─ ReconciliationAmountComparison.vue
├─ ReconciliationFilters.vue
├─ ReconciliationTable.vue
├─ ReconciliationCaseDrawer.vue
├─ ReconciliationDecisionModal.vue
├─ ReconciliationTimeline.vue
├─ ReconciliationSyncButton.vue
└─ ReconciliationEmptyState.vue
```

Reutilizar sempre que possível:

```text
AppTable
AppModal
AppConfirmDialog
AppPageHeader
AppToast
AppPagination
AppDateRangePicker
```

## Regras

- Status/matchType são mapeados para i18n, ícone e aparência em um único lugar.
- Tabela, filtros e modal não duplicam lógica entre listagem, malha fina e detalhe.
- Loading é local no botão e desabilita ação duplicada.
- Dados sensíveis, payload bruto, tokens e URLs privadas não aparecem no drawer.
- Badges não dependem apenas de cor.
- Rotas com lazy loading.
- Valores monetários exibidos vêm de `amountMinor + currency + exponent`, nunca de parsing improvisado na UI.

## i18n

pt-BR e en-US obrigatórios:

```text
navigation.reconciliation
reconciliation.title
reconciliation.status.*
reconciliation.matchType.*
reconciliation.summary.*
reconciliation.filters.*
reconciliation.actions.*
reconciliation.decision.*
reconciliation.timeline.*
reconciliation.sync.*
reconciliation.export.*
reconciliation.errors.*
reconciliation.empty.*
```

Sem texto hardcoded e sem chave crua na UI. Erros de domínio retornam código; frontend traduz.
