# ADR-0009 — Arquitetura Frontend com Vue 3, TypeScript, Pinia, Tailwind e Componentização Reutilizável

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow precisa de um frontend corporativo para operação financeira B2B.

O painel deve permitir:

* Login.
* Gestão de clientes.
* Gestão de cobranças.
* Visualização de pagamentos.
* Dashboard financeiro.
* Exportação de relatórios.
* Gestão de webhooks.
* Gestão de API Keys.
* Configurações de gateway.
* Gestão de usuários e permissões.
* Notificações.
* Visualização de erros amigáveis.
* Alternância de idioma.
* Experiência consistente com toasts, modais e estados visuais.

O frontend precisa ser:

* Componentizado.
* Reutilizável.
* Performático.
* Traduzível.
* Tipado.
* Fácil de manter.
* Integrado com backend via services.
* Preparado para controle de permissões.
* Visualmente consistente.

---

## 2. Decisão

O frontend do LedgerFlow será desenvolvido com:

* **Vue 3**.
* **Composition API**.
* **TypeScript**.
* **Pinia** para estado global.
* **Vue Router** para rotas.
* **Tailwind CSS** para estilos.
* **Heroicons** para ícones.
* **Axios** centralizado para HTTP.
* **Arquivos JSON** para i18n.
* **Lazy loading** para views.
* **Componentização rígida** para UI.

---

## 3. Estrutura de Diretórios

```text
apps/web/src/
├── main.ts
├── App.vue
├── assets/
│   └── styles/
│       └── main.css
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── tables/
│   ├── modals/
│   ├── feedback/
│   └── forms/
├── views/
├── router/
├── stores/
├── services/
├── locales/
├── composables/
├── types/
└── utils/
```

---

## 4. Regras Arquiteturais

1. Views não devem chamar Axios diretamente.
2. Chamadas HTTP devem ficar em `services`.
3. Estado global deve ficar em stores Pinia.
4. Componentes devem ser reutilizáveis.
5. Componentes visuais não devem conter regra de negócio pesada.
6. Rotas devem usar lazy loading.
7. Componentes pesados devem ser carregados sob demanda.
8. Tabelas devem usar paginação do backend.
9. Permissões devem controlar menus e botões.
10. Backend continua sendo a fonte real de autorização.

---

## 5. Services HTTP

Será criado um client HTTP centralizado.

```typescript
import axios from 'axios';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ledgerflow_access_token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

Exemplo de service:

```typescript
import { httpClient } from './http-client';

export const PaymentService = {
  async paginate(params: { page: number; limit: number }) {
    const response = await httpClient.get('/payments', { params });
    return response.data;
  },

  async refund(paymentId: string) {
    const response = await httpClient.post(`/payments/${paymentId}/refund`);
    return response.data;
  }
};
```

---

## 6. Estado Global com Pinia

Stores planejadas:

```text
auth.store.ts
locale.store.ts
toast.store.ts
modal.store.ts
notification.store.ts
permission.store.ts
```

Responsabilidades:

* `auth.store`: sessão, usuário e tokens.
* `locale.store`: idioma e traduções.
* `toast.store`: feedback visual.
* `modal.store`: modais globais.
* `notification.store`: notificações in-app.
* `permission.store`: helpers de permissão.

---

## 7. Componentização

Componentes base:

```text
Button
Input
Select
Textarea
Card
Badge
Modal
ConfirmModal
ToastContainer
DataTable
Pagination
DateRangePicker
Dropdown
PageHeader
ActionMenu
StatusBadge
LoadingState
ErrorState
EmptyState
PermissionGuard
```

Componentes de dashboard:

```text
KpiCard
DashboardChart
PaymentVolumeChart
ApprovalRateChart
ProviderDistributionChart
WebhookFailureChart
```

---

## 8. Renderização Sob Demanda

Para evitar renderização desnecessária, serão usados:

* Lazy loading de rotas.
* `defineAsyncComponent`.
* `v-if` para componentes que só devem existir quando chamados.
* Paginação backend.
* Carregamento por aba.

Exemplo:

```typescript
import { defineAsyncComponent, ref } from 'vue';

const activeTab = ref<'overview' | 'transactions'>('overview');

const AsyncTransactionsTable = defineAsyncComponent(() =>
  import('@/components/payments/TransactionsTable.vue')
);
```

```vue
<AsyncTransactionsTable v-if="activeTab === 'transactions'" />
```

---

## 9. Estilos com Tailwind e Tokens Globais

Arquivo principal:

```text
src/assets/styles/main.css
```

Exemplo:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-brand-primary: #4f46e5;
    --color-brand-success: #10b981;
    --color-brand-warning: #f59e0b;
    --color-brand-danger: #ef4444;

    --color-bg-main: #09090b;
    --color-bg-card: #18181b;
    --color-border: #27272a;

    --color-text-main: #fafafa;
    --color-text-muted: #a1a1aa;

    --font-main: 'Inter', sans-serif;
  }

  body {
    font-family: var(--font-main);
    background: var(--color-bg-main);
    color: var(--color-text-main);
  }
}

@layer components {
  .lf-card {
    @apply bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm;
  }

  .lf-btn-primary {
    @apply bg-[var(--color-brand-primary)] text-white font-medium px-4 py-2 rounded-lg transition-colors hover:opacity-90;
  }
}
```

---

## 10. Internacionalização

Traduções serão armazenadas em JSON.

```text
src/locales/
├── pt-BR.json
├── en-US.json
└── es-ES.json
```

Exemplo:

```json
{
  "common": {
    "confirm": "Confirmar",
    "cancel": "Cancelar",
    "loading": "Carregando..."
  },
  "errors": {
    "FORBIDDEN": "Você não tem permissão para executar esta ação.",
    "PAYMENT_GATEWAY_UNAVAILABLE": "Não foi possível processar o pagamento neste momento."
  }
}
```

Regras:

* Não usar strings importantes hardcoded.
* Mensagens de erro devem usar `code`.
* Idioma deve persistir no localStorage.
* E-mails também devem respeitar locale.
* Datas devem respeitar timezone do usuário ou tenant.

---

## 11. Toasts e Modais

O frontend terá feedback visual centralizado.

Tipos de toast:

```text
success
error
warning
info
loading
```

Ações que exigem modal:

```text
Reembolsar pagamento
Cancelar assinatura
Excluir usuário
Revogar API Key
Alterar gateway
Reprocessar webhook
Exportar relatório pesado
Desativar integração
```

Regras:

* Ação crítica não executa sem confirmação.
* Modal deve explicar consequência.
* Toast deve ser traduzível.
* Erros devem ser amigáveis.
* Loading deve ser claro.

---

## 12. Permissões no Frontend

O frontend deve:

* Esconder menus sem permissão.
* Esconder botões sem permissão.
* Bloquear rotas sem permissão.
* Exibir mensagem amigável quando necessário.

Mas a segurança real deve estar sempre no backend.

Exemplo:

```vue
<PermissionGuard permission="payments:refund">
  <button>Reembolsar</button>
</PermissionGuard>
```

---

## 13. Paginação

Todas as listagens devem usar paginação backend.

Exemplo de response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 200,
    "lastPage": 10
  }
}
```

Regras:

* Não carregar listas completas.
* Não paginar apenas no frontend.
* Filtros devem ser enviados para API.
* Query params devem refletir filtros quando fizer sentido.

---

## 14. Alternativas Consideradas

## 14.1 Vue 3

### Vantagens

* Boa produtividade.
* Excelente com Composition API.
* Boa curva de aprendizado.
* Ótimo para dashboards.
* Menos verboso que algumas alternativas.
* Boa integração com Vite e TypeScript.

### Desvantagens

* Ecossistema enterprise menor que React em algumas empresas.
* Algumas libs podem ter menor adoção.

## 14.2 React

### Vantagens

* Muito usado no mercado.
* Ecossistema gigante.
* Muitas libs.
* Forte adoção enterprise.

### Desvantagens

* O projeto já tem preferência por Vue.
* Pode exigir mais decisões de arquitetura.
* Estado, forms e padrões podem variar muito.

## 14.3 Angular

### Vantagens

* Muito enterprise.
* Estrutura opinativa.
* TypeScript nativo.
* Bom para sistemas grandes.

### Desvantagens

* Mais pesado.
* Curva maior.
* Menos alinhado à stack escolhida.

## 14.4 Vue 3 + TypeScript + Pinia

### Vantagens

* Equilíbrio entre simplicidade e robustez.
* Boa componentização.
* Boa performance.
* Boa experiência de desenvolvimento.
* Adequado para portfólio.
* Alinhado à preferência do projeto.

### Desvantagens

* Exige disciplina para manter organização.
* Algumas decisões arquiteturais precisam ser definidas pelo time.
* Componentização excessiva pode gerar fragmentação.

---

## 15. Consequências

## 15.1 Positivas

* Frontend organizado.
* Melhor reutilização de componentes.
* Menor acoplamento com API.
* Melhor experiência do usuário.
* Interface traduzível.
* Dashboard performático.
* Projeto visualmente mais profissional.
* Facilita manutenção.

## 15.2 Negativas

* Mais arquivos.
* Mais estrutura inicial.
* Necessário manter padrão de componentes.
* Necessário evitar overengineering.
* Necessário documentar componentes principais.

---

## 16. Segurança

Regras:

* Não armazenar refresh token inseguramente, se possível.
* Evitar expor dados sensíveis no localStorage.
* Não exibir secrets completas.
* Mascarar API Keys.
* Mascarar payloads sensíveis.
* Não confiar em permissões apenas no frontend.
* Sanitizar inputs.
* Evitar uso de `v-html`.
* Tratar erros sem mostrar stack trace.
* Aplicar timeout nas requests.

---

## 17. Critérios de Validação

Esta decisão será considerada correta se:

* Views não chamarem Axios diretamente.
* Services centralizarem chamadas HTTP.
* Stores centralizarem estado global.
* Componentes forem reutilizáveis.
* Rotas usarem lazy loading.
* Menus e botões respeitarem permissões.
* Backend continuar validando permissões.
* Tabelas usarem paginação backend.
* Interface suportar i18n.
* Toasts e modais forem globais.
* Design visual for consistente.

---

## 18. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto exigir SSR.
* O projeto exigir SEO público.
* O frontend crescer para múltiplas aplicações.
* O sistema virar white-label.
* A equipe futura preferir React ou Angular.

Possíveis evoluções futuras:

* Nuxt.
* Microfrontends.
* Storybook.
* Design tokens avançados.
* Testes visuais.
* Tema white-label.

---

## Implementation Notes

### Phase 2C
Phase 2C — Frontend Authentication Foundation has been implemented.
This included:
- LoginView
- AuthStore with Pinia
- Token storage (localStorage)
- Axios interceptors for automatic token refresh
- Router guards for private routes
- Authenticated layout
- PermissionGate component
- Consumption of `/auth/me` and frontend logout.

*Known Limitation*: Currently, tokens are stored in `localStorage` to simplify the local environment and portfolio setup. In a production environment, this should be evaluated and moved to HttpOnly, Secure, and SameSite cookies for refresh tokens.

