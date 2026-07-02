# Software Design Document — SDD

# LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

**Versão:** 1.0.0
**Status:** Consolidado para início de desenvolvimento
**Arquitetura:** Modular Monolith, Microservices-Ready, Clean Architecture
**Backend:** NestJS + TypeScript (Swagger UI / Redoc para API Docs)
**Frontend:** Vue 3 + TypeScript
**Banco Relacional:** PostgreSQL
**Banco Documental:** MongoDB
**Cache e Locks:** Redis
**Mensageria:** RabbitMQ
**ORM:** Prisma
**Observabilidade:** OpenTelemetry, Prometheus, Grafana, Datadog opcional
**Containerização:** Docker e Docker Compose

---

# 1. Visão Técnica Geral

O LedgerFlow será desenvolvido como um **monólito modular preparado para evolução em microserviços**.

A escolha inicial por monólito modular reduz complexidade operacional durante o desenvolvimento, mas mantém separação clara de domínios para que módulos possam ser extraídos futuramente.

A arquitetura seguirá princípios de:

* Clean Architecture.
* Domain-Driven Design pragmático.
* Repository Pattern.
* Strategy Pattern.
* Factory Pattern.
* Outbox Pattern.
* Inbox Pattern.
* Event-driven architecture.
* API-first.
* Observability-first.
* Security by design.

---

# 2. Arquitetura de Alto Nível

```text
[ Vue 3 Dashboard ]
        |
        | REST / WebSocket
        v
[ NestJS API ]
        |
        |----------------------------------|
        |                                  |
        v                                  v
[ PostgreSQL ]                      [ MongoDB ]
Dados transacionais                 Auditoria, payloads brutos,
tenants, usuários,                  logs de eventos externos
permissões, pagamentos
        |
        | 
        v
[ Redis ]
Cache, rate limit,
idempotência, locks
        |
        v
[ RabbitMQ ]
Filas, eventos assíncronos,
e-mails, webhooks, exports
        |
        |-------------------------------|
        |                               |
        v                               v
[ Workers NestJS ]               [ APIs externas ]
Pagamentos, e-mails,              Stripe, Asaas,
webhooks, relatórios              Mercado Pago
        |
        v
[ Observabilidade ]
OpenTelemetry, Prometheus,
Grafana, Datadog opcional
```

---

# 3. Decisão Arquitetural Principal

## 3.1 Modular Monolith

O backend será inicialmente um monólito modular.

## Justificativa

* Menor complexidade inicial.
* Mais fácil de rodar localmente.
* Melhor para portfólio.
* Permite demonstrar arquitetura limpa.
* Facilita extração futura para microserviços.
* Evita sobrecarga desnecessária de rede e deploy.

## Regra

Cada módulo deve possuir fronteiras claras e não deve acessar diretamente estruturas internas de outro módulo.

---

# 4. Estrutura de Diretórios

## 4.1 Estrutura geral

```text
ledgerflow/
├── apps/
│   ├── api/
│   └── web/
├── docs/
│   ├── prd.md
│   ├── sdd.md
│   ├── implementation-plan.md
│   ├── adr/
│   ├── diagrams/
│   └── runbooks/
├── docker-compose.yml
├── README.md
└── .env.example
```

---

## 4.2 Backend NestJS

```text
apps/api/src/
├── main.ts
├── app.module.ts
├── config/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── errors/
│   ├── logger/
│   └── utils/
├── database/
│   ├── prisma/
│   └── mongodb/
├── modules/
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   ├── customers/
│   ├── payments/
│   ├── payment-gateways/
│   ├── webhooks/
│   ├── reports/
│   ├── notifications/
│   ├── emails/
│   ├── audit/
│   ├── observability/
│   └── health/
└── workers/
    ├── outbox/
    ├── emails/
    ├── webhooks/
    └── reports/
```

---

## 4.3 Estrutura interna de módulo

```text
modules/payments/
├── application/
│   ├── use-cases/
│   ├── services/
│   └── dto/
├── domain/
│   ├── entities/
│   ├── enums/
│   ├── interfaces/
│   └── events/
├── infra/
│   ├── repositories/
│   ├── mappers/
│   └── providers/
├── presentation/
│   ├── controllers/
│   └── presenters/
└── payments.module.ts
```

---

## 4.4 Frontend Vue

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

# 5. Backend — Design Técnico

# 5.1 NestJS

O NestJS será a camada principal da API.

## Responsabilidades

* Expor endpoints REST.
* Autenticar usuários.
* Autorizar permissões.
* Executar regras de negócio.
* Publicar eventos.
* Consumir filas.
* Registrar logs.
* Expor métricas.
* Integrar APIs externas.

---

# 5.2 Clean Architecture

## Camadas

### Domain

Contém regras centrais, entidades, enums, interfaces e eventos.

Não deve depender de NestJS, Prisma, Stripe ou qualquer infraestrutura externa.

### Application

Contém use cases e services de aplicação.

Orquestra regras do domínio.

### Infrastructure

Contém implementações técnicas:

* Prisma repositories.
* Stripe adapter.
* MongoDB audit repository.
* Redis service.
* RabbitMQ publisher.
* Email providers.

### Presentation

Contém controllers, DTOs de entrada e presenters.

---

# 5.3 Repository Pattern

Services e use cases não devem executar queries diretamente.

## Exemplo

```typescript
export interface PaymentRepository {
  create(input: CreatePaymentRepositoryInput): Promise<Payment>;
  findById(id: string, tenantId: string): Promise<Payment | null>;
  paginate(input: PaginatePaymentsInput): Promise<PaginatedResult<Payment>>;
  updateStatus(input: UpdatePaymentStatusInput): Promise<void>;
}
```

Implementação:

```typescript
@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: {
        id,
        tenantId
      }
    });
  }
}
```

---

# 5.4 Prisma

O Prisma será utilizado para persistência no PostgreSQL.

## Regras

* Usar migrations versionadas.
* Não usar query solta em services.
* Queries complexas devem ficar em repositories.
* Todas as entidades sensíveis devem possuir `tenantId`.
* Usar transações para operações financeiras.
* Criar índices para campos de busca e filtros.

---

# 5.5 PostgreSQL

O PostgreSQL será a base relacional principal.

## Dados armazenados

* Tenants.
* Usuários.
* Roles.
* Permissions.
* Clientes.
* Pagamentos.
* Assinaturas.
* Credenciais criptografadas.
* Webhooks configurados.
* Outbox events.
* Inbox events.
* Export jobs.
* Notificações.
* API Keys com hash.

## Datas

* Usar `TIMESTAMPTZ`.
* Persistir em UTC.
* Trafegar em ISO 8601.
* Exibir conforme timezone do usuário/tenant.

---

# 5.6 MongoDB

MongoDB será usado para dados semiestruturados e auditoria pesada.

## Dados armazenados

* Payloads brutos de gateways.
* Payloads de webhooks.
* Histórico detalhado de eventos.
* Snapshots de requests/responses externos.
* Logs de auditoria ricos.
* Metadados variáveis por provider.

## Justificativa

Gateways diferentes possuem payloads diferentes. MongoDB permite armazenar essa variação sem forçar modelagem relacional rígida.

---

# 5.7 Redis

Redis será utilizado para:

* Cache.
* Rate limiting.
* Idempotência.
* Locks distribuídos.
* Controle temporário de tentativas.
* Sessões auxiliares, se necessário.

## Exemplos

* Chave idempotente para criação de pagamento.
* Lock para evitar reembolso duplicado.
* Rate limit em login.
* Cache de permissões do usuário.
* Cache de dashboard por curto período.

---

# 5.8 RabbitMQ

RabbitMQ será usado para processamento assíncrono.

## Filas principais

```text
payments.processing.queue
emails.sending.queue
webhooks.dispatch.queue
reports.export.queue
outbox.publisher.queue
notifications.queue
```

## Exchanges

```text
ledgerflow.events.exchange
ledgerflow.dlx.exchange
```

## Regras

* Toda tarefa demorada deve ir para fila.
* Consumers devem ser idempotentes.
* Falhas devem ter retry.
* Falhas definitivas devem ir para DLQ.
* Mensagens devem conter `traceId`, `tenantId` e `eventId`.

---

# 5.9 User Management Write Operations

## Regras de Negócio e Segurança

A gestão de usuários (CRUD) possui regras restritas para garantir a estabilidade e o isolamento dos tenants:

* **Multitenancy**: Todas as queries e mutations filtram obrigatoriamente pelo `tenantId` do usuário logado (`@CurrentUser()`).
* **Senhas Temporárias**: Na criação (Fase 3B), o usuário recebe uma `temporaryPassword` obrigatória (mínimo de 8 caracteres). Essa senha deve ser hasheada com bcrypt da mesma forma que senhas normais. Futuramente, pode haver um flag para forçar a troca no primeiro login.
* **Proteção do Owner**: Nenhum usuário pode remover a role `OWNER` do próprio usuário logado caso seja um admin alterando a si mesmo (previne bloqueio do sistema).
* **Soft Delete**: Não existem exclusões físicas (`DELETE`) para usuários. Operações de remoção alteram o status `active` para `false`.
* **Revogação de Sessão em Cascata**: Ao desativar um usuário (`active: false`), o sistema revoga proativamente todos os seus `RefreshTokens` e `UserSessions` ativos no banco de dados.

## Operações Suportadas

* `POST /users`: Criação (requer `users:create`).
* `PATCH /users/:id`: Edição de dados básicos como nome e e-mail (requer `users:update`).
* `PATCH /users/:id/status`: Ativação/Desativação (requer `users:update`).
* `PATCH /users/:id/roles`: Substituição das roles associadas (requer `users:update`).

---

# 6. Pagamentos — Strategy + Factory

# 6.1 Objetivo

Permitir que o sistema trabalhe com múltiplos gateways (Stripe, Asaas, Mercado Pago, etc.) sem alterar o core da aplicação. Utiliza AES-256-GCM para armazenamento de chaves de API e integrações via OAuth 2.0.

---

# 6.2 Interface principal

```typescript
export interface CreateGatewayCustomerInput {
  tenantId: string;
  name: string;
  email: string;
  document?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentInput {
  tenantId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface RefundPaymentInput {
  tenantId: string;
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface GatewayPaymentResponse {
  gateway: string;
  gatewayTransactionId: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  rawResponse: unknown;
}

export interface IPaymentGateway {
  createCustomer(input: CreateGatewayCustomerInput): Promise<unknown>;
  createPayment(input: CreatePaymentInput): Promise<GatewayPaymentResponse>;
  refundPayment(input: RefundPaymentInput): Promise<GatewayPaymentResponse>;
}
```

---

# 6.3 Factory

```typescript
@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly stripeAdapter: StripePaymentGateway,
    private readonly asaasAdapter: AsaasPaymentGateway,
    private readonly mercadoPagoAdapter: MercadoPagoPaymentGateway
  ) {}

  getProvider(providerName: string): IPaymentGateway {
    switch (providerName.toLowerCase()) {
      case 'stripe':
        return this.stripeAdapter;
      case 'asaas':
        return this.asaasAdapter;
      case 'mercadopago':
        return this.mercadoPagoAdapter;
      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }
}
```

---

# 6.4 Regras importantes

* SDK do Stripe só pode existir dentro do adapter Stripe.
* Services de pagamento dependem da interface, não do provider.
* Provider é definido por tenant.
* Status externo deve ser convertido para status interno.
* Payload bruto deve ser salvo no MongoDB.
* Dados financeiros normalizados devem ficar no PostgreSQL.
* Credenciais devem ser criptografadas.

---

# 6.5 Integração Asaas (Sandbox)

A primeira integração real do sistema (implementada na Fase 6.1) foca exclusivamente no ambiente Sandbox do Asaas.

## Características:
* **Isolamento Total:** Credenciais criptografadas via AES-256-GCM (nunca injetadas globalmente, apenas decriptadas em memória).
* **Mapeamento de Customer:** Uso da entidade intermediária `GatewayCustomerReference` para evitar duplicidade de clientes no provedor.
* **Idempotência Externa:** Validação via GET `/payments?externalReference={ref}` antes do POST de criação, blindando falhas de concorrência ou timeouts de resposta do provider.
* **Orquestração Assíncrona-Like:** Embora síncrono no primeiro momento, a criação da fatura interna sempre prevalece (estado `PENDING`) e não bloqueia a continuidade caso o asaas apresente instabilidade - registrando na auditoria a falha e o adapter apenas interrompe a chamada, delegando re-tentativas para fluxos futuros (Webhooks/Filas).

---

# 7. Segurança

# 7.1 Autenticação

* JWT para access token.
* Refresh token seguro.
* Refresh token armazenado com hash.
* Expiração curta para access token.
* Logout invalida refresh token.
* Rate limiting no login.
* Recuperação de senha segura: não informa existência de e-mail e não persiste token temporário no client.

---

# 7.2 Autorização

* RBAC como base.
* ABAC preparado para regras contextuais.
* Guards no NestJS.
* Decorators para permissões.
* Frontend apenas melhora UX, não garante segurança.
* Backend sempre valida permissão.

Exemplo:

```typescript
@RequirePermissions('payments:refund')
@Post(':id/refund')
refundPayment() {}
```

---

# 7.3 Criptografia

## Segredos criptografados

* Stripe Secret Key.
* Asaas API Key.
* Mercado Pago Access Token.
* Webhook secrets.
* Credenciais de integração.

## Algoritmo sugerido

* AES-256-GCM para criptografia de segredos.
* Chaves de criptografia vindas de variáveis de ambiente.
* Nunca logar valores descriptografados.

---

# 7.4 API Keys

* API Keys devem ser exibidas apenas uma vez.
* Armazenar somente hash.
* Permitir revogação.
* Registrar último uso.
* Permitir escopos de acesso.

---

# 7.5 Webhooks

## Inbound

* Validar assinatura do provider.
* Stripe deve validar header `stripe-signature`.
* Usar raw body para validação.
* Rejeitar payload inválido.
* Registrar evento em Inbox.

## Outbound

* Assinar payload com HMAC.
* Enviar timestamp.
* Enviar eventId.
* Permitir validação pelo cliente.
* Retentar falhas.
* Registrar tentativas.

---

# 7.6 Headers e proteção HTTP

* Helmet.
* CORS restrito.
* Rate limit.
* Body size limit.
* Validação de DTOs.
* Sanitização.
* Não retornar stack trace ao frontend.

---

# 8. Tratamento Global de Erros

# 8.1 Estrutura padrão

```typescript
export interface ApiErrorResponse {
  code: string;
  message: string;
  traceId: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}
```

---

# 8.2 Error Codes

```typescript
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_GATEWAY_UNAVAILABLE = 'PAYMENT_GATEWAY_UNAVAILABLE',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_ALREADY_PROCESSED = 'WEBHOOK_ALREADY_PROCESSED',
  EXPORT_TOO_LARGE_SYNC = 'EXPORT_TOO_LARGE_SYNC',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}
```

---

# 8.3 Global Exception Filter

Responsabilidades:

* Capturar erros.
* Normalizar resposta.
* Adicionar `traceId`.
* Esconder stack trace do usuário.
* Logar erro completo internamente.
* Converter erros externos em mensagens amigáveis.

---

# 9. Internacionalização

# 9.1 Frontend

Traduções em JSON:

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

---

# 9.2 Store de idioma

```typescript
export const useLocaleStore = defineStore('locale', () => {
  const currentLocale = ref(localStorage.getItem('ledgerflow_lang') || 'pt-BR');
  const translations = ref<Record<string, any>>({});

  async function setLocale(lang: string) {
    const module = await import(`../locales/${lang}.json`);
    translations.value = module.default;
    currentLocale.value = lang;
    localStorage.setItem('ledgerflow_lang', lang);
  }

  function t(key: string): string {
    return key.split('.').reduce((obj, part) => obj?.[part], translations.value) || key;
  }

  return {
    currentLocale,
    translations,
    setLocale,
    t
  };
});
```

---

# 9.3 Backend

O backend deve retornar códigos padronizados.
O frontend traduzirá a mensagem com base no `code`.

E-mails devem usar templates por idioma.

---

# 10. Timezones e Datas

# 10.1 Persistência

* PostgreSQL: `TIMESTAMPTZ`.
* Armazenar em UTC.
* Nunca armazenar data local sem timezone.

---

# 10.2 API

* Trafegar datas em ISO 8601.
* Exemplo: `2026-06-12T18:30:00.000Z`.

---

# 10.3 Frontend

* Exibir com `Intl.DateTimeFormat`.
* Timezone preferencial vem do tenant ou usuário.
* Fallback: timezone do navegador.

Exemplo:

```typescript
export function formatDateTime(date: string, timeZone = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone
  }).format(new Date(date));
}
```

---

# 10.4 Relatórios

Relatórios devem informar:

* Período filtrado.
* Timezone usado no filtro.
* Data de geração.
* Timezone da geração.

---

# 11. Frontend — Arquitetura

# 11.1 Vue 3

O frontend será desenvolvido com:

* Vue 3.
* Composition API.
* TypeScript.
* Pinia.
* Vue Router.
* Tailwind CSS.
* Heroicons.
* Axios.

---

# 11.2 Regras

* Views não chamam Axios diretamente.
* Services concentram chamadas HTTP.
* Stores concentram estado global.
* Componentes devem ser reutilizáveis.
* Rotas devem usar lazy loading.
* Componentes pesados devem usar carregamento assíncrono.
* Menus ocultos não devem renderizar componentes.
* Tabelas usam paginação backend.
* Estilos devem ser centralizados.
* **UI Blueprint:** Todo o desenvolvimento visual deve se guiar pelo `docs/ui-design-system.md` e referências base.
* **Componentização:** Nova interface deve ser baseada em componentes reutilizáveis (`AppButton`, `AppInput`, etc).
* **Layout:** Adoção do `AppLayout` sem header global, utilizando a Sidebar como principal meio de navegação e controle da sessão.
* **i18n:** Internacionalização obrigatória. Todo texto de interface deve possuir chaves de idioma.
* **RBAC:** A restrição de acesso e renderização condicional (ex: `<PermissionGate>`) no frontend atua primariamente como melhoria de UX. O backend permanece sendo a **autoridade final**.

---

# 11.3 Axios

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

---

# 11.4 Services

```typescript
import { httpClient } from './http-client';

export const TransactionService = {
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

# 11.5 Lazy Loading

```typescript
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/DashboardView.vue')
  },
  {
    path: '/payments',
    component: () => import('@/views/PaymentsView.vue')
  }
];
```

---

# 11.6 Componentes assíncronos

```typescript
import { defineAsyncComponent } from 'vue';

const AsyncTransactionsTable = defineAsyncComponent(() =>
  import('@/components/payments/TransactionsTable.vue')
);
```

---

# 11.7 Tailwind e CSS centralizado

Arquivo:

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

# 12. Toasts, Modais e Feedback Visual

# 12.1 Toasts

Tipos:

* Success.
* Error.
* Warning.
* Info.
* Loading.

## Store

```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
```

---

# 12.2 Modais de confirmação

Ações críticas devem usar modal:

* Reembolsar pagamento.
* Cancelar assinatura.
* Excluir usuário.
* Revogar API Key.
* Alterar gateway.
* Reprocessar webhook.
* Exportar relatório pesado.

---

# 12.3 Estados reutilizáveis

Criar componentes:

* `LoadingState`
* `ErrorState`
* `EmptyState`
* `ConfirmModal`
* `ToastContainer`
* `StatusBadge`

---

# 13. E-mails

# 13.1 Interface

```typescript
export interface SendEmailInput {
  to: string;
  subject: string;
  template: string;
  locale: 'pt-BR' | 'en-US' | 'es-ES';
  variables: Record<string, unknown>;
}

export interface IEmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
```

---

# 13.2 Providers

Inicial:

* SMTP com Mailpit.

Futuros:

* SendGrid.
* Resend.
* AWS SES.

---

# 13.3 Fluxo

```text
Use Case
  ↓
Outbox Event
  ↓
RabbitMQ
  ↓
Email Consumer
  ↓
Render Template
  ↓
Email Provider
  ↓
Mailpit / Provider externo
```

---

# 13.4 Templates

```text
modules/emails/templates/
├── pt-BR/
├── en-US/
└── es-ES/
```

---

# 14. Relatórios e Streams

# 14.1 CSV

CSV deve usar Node.js Streams.

Fluxo:

```text
Query paginada/cursor
  ↓
Transform Stream
  ↓
Write Stream
  ↓
Arquivo temporário ou Response
```

---

# 14.2 XLSX

XLSX deve usar `ExcelJS.stream.xlsx.WorkbookWriter`.

```typescript
const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
  stream: response,
  useStyles: true,
  useSharedStrings: true
});
```

---

# 14.3 Exportações grandes

Exportações acima do limite definido devem ser assíncronas.

Fluxo:

```text
Usuário solicita relatório
  ↓
Cria export_job
  ↓
Publica evento
  ↓
Worker gera arquivo
  ↓
Atualiza status
  ↓
Notifica usuário
  ↓
Usuário baixa arquivo
```

---

# 15. Observabilidade

# 15.1 Logs

Usar logs estruturados em JSON.

Biblioteca sugerida:

* Pino.

Campos mínimos:

```json
{
  "level": "info",
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "userId": "user-id",
  "route": "/payments",
  "statusCode": 200,
  "durationMs": 123,
  "message": "Payment created"
}
```

---

# 15.2 OpenTelemetry

Instrumentar:

* HTTP.
* NestJS.
* Prisma.
* RabbitMQ.
* Chamadas externas.
* Workers.

Cada fluxo deve manter o `traceId`.

---

# 15.3 Prometheus

Expor métricas técnicas:

* Latência HTTP.
* Taxa de erro.
* Número de requests.
* Tempo de queries.
* Tamanho de filas.
* Mensagens em DLQ.
* Uso de memória.
* Uso de CPU.

---

# 15.4 Métricas de negócio

* Pagamentos criados.
* Pagamentos aprovados.
* Pagamentos recusados.
* TPV.
* Taxa de aprovação.
* Reembolsos.
* Webhooks enviados.
* Webhooks com falha.
* Relatórios gerados.
* Tempo médio de processamento.

---

# 15.5 Grafana

Criar dashboards:

* API Health.
* RabbitMQ.
* PostgreSQL.
* Redis.
* Payments Business Dashboard.
* Webhook Delivery Dashboard.
* Report Export Dashboard.

---

# 15.6 Datadog

Datadog será integração opcional para simular ambiente corporativo com APM proprietário.

Regras:

* Não depender do Datadog para rodar o projeto local.
* Prometheus e Grafana serão a base local.
* Datadog deve ser documentado como opcional.

---

# 16. Outbox Pattern

# 16.1 Objetivo

Evitar perda de eventos quando uma operação de banco é concluída, mas a publicação na fila falha.

---

# 16.2 Tabela

```text
outbox_events
├── id
├── tenant_id
├── event_type
├── payload
├── status
├── attempts
├── published_at
├── created_at
└── updated_at
```

---

# 16.3 Status

* `PENDING`
* `PUBLISHED`
* `FAILED`

---

# 16.4 Fluxo

```text
Use Case
  ↓
PostgreSQL Transaction
  ↓
Salva entidade principal
  ↓
Salva outbox_event
  ↓
Commit
  ↓
Outbox Worker
  ↓
RabbitMQ
  ↓
Marca como publicado
```

---

# 17. Inbox Pattern

# 17.1 Objetivo

Garantir processamento seguro de eventos externos recebidos.

---

# 17.2 Tabela

```text
inbox_events
├── id
├── tenant_id
├── provider
├── external_event_id
├── event_type
├── payload
├── status
├── processed_at
├── attempts
├── error_message
├── created_at
└── updated_at
```

---

# 17.3 Status

* `RECEIVED`
* `PROCESSING`
* `PROCESSED`
* `FAILED`
* `IGNORED`

---

# 17.4 Fluxo

```text
Recebe webhook
  ↓
Valida assinatura
  ↓
Salva inbox_event
  ↓
Verifica duplicidade
  ↓
Processa evento
  ↓
Atualiza entidade
  ↓
Registra auditoria
```

---

# 18. Documentação Técnica

# 18.1 Swagger

Usado para testar rotas em ambiente de desenvolvimento.

Rota:

```text
/api/docs
```

---

# 18.2 Redoc

Usado como documentação pública mais elegante.

Rota:

```text
/api/reference
```

---

# 18.3 AsyncAPI

Usado para documentar:

* Eventos.
* Filas.
* Exchanges.
* Routing keys.
* Payloads assíncronos.

---

# 18.4 ADRs

Criar Architecture Decision Records para decisões relevantes.

Exemplos:

```text
docs/adr/
├── 0001-architecture-style.md
├── 0002-payment-gateway-abstraction.md
├── 0003-outbox-inbox-pattern.md
├── 0004-observability-stack.md
└── 0005-multitenancy-model.md
```

---

# 18.5 Diagramas

Criar:

* C4 Context.
* C4 Container.
* Diagrama de banco.
* Diagrama de filas.
* Diagrama de observabilidade.
* Fluxo de pagamentos.
* Fluxo de webhooks.
* Fluxo de exportação.

---

### Webhook Inbox Pattern — Asaas

O sistema utiliza a arquitetura de *Inbox Pattern* com a entidade `WebhookInboxEvent` para gerenciar as notificações do Asaas Sandbox com segurança e idempotência.

- **Idempotência:** A chave única engloba `provider` + `providerEventId`. Mensagens retransmitidas pelo Asaas geram `HTTP 200` automático caso a chave já exista, prevenindo atualizações duplas.
- **Autenticação:** Ocorre comparando (em *timing-safe*) a chave secreta global do `asaas-access-token`.
- **Status Mapping:** Baseado no evento original, o LedgerFlow atualiza os status internos da engine (`PENDING`, `APPROVED`, `CANCELED`, etc).
- **Audit e Eventos:** Transições significativas de status disparam `PaymentEvent` (Timeline do front-end) e registros imutáveis de `AuditLog`.
- **Evolução:** Atualizações atualmente processadas de forma síncrona. O Inbox foi modelado de maneira a facilitar migração futura para infraestrutura com RabbitMQ e *Outbox Pattern*.

## 4. Banco de Dados — Modelo Inicial

# 19.1 Entidades principais

## Relacionais — PostgreSQL

* Tenant.
* User.
* Role.
* Permission.
* UserRole.
* RolePermission.
* Customer.
* Payment.
* PaymentEvent.
* PaymentGatewayConfig.
* WebhookEndpoint.
* WebhookDelivery.
* ApiKey.
* ExportJob.
* Notification.
* OutboxEvent.
* InboxEvent.
* RefreshToken.

## Documentais — MongoDB

* AuditLog.
* GatewayRawPayload.
* WebhookRawPayload.
* ExternalRequestLog.

---

# 19.2 Campos obrigatórios em entidades críticas

```text
id
tenantId
createdAt
updatedAt
createdBy
updatedBy
```

Quando aplicável:

```text
deletedAt
deletedBy
```

---

# 20. Paginação

Todas as listagens devem usar paginação backend.

## Request

```text
GET /payments?page=1&limit=20
```

## Response

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

## Regras

* Limite padrão: 20.
* Limite máximo: 50.
* Filtros devem ser feitos no backend.
* Ordenação deve ser explícita.
* Consultas devem respeitar tenant.

---

# 21. Testes

# 21.1 Backend

Tipos:

* Unitários.
* Integração.
* E2E.
* Testcontainers.
* Testes de RBAC.
* Testes multitenant.
* Testes de idempotência.
* Testes de webhooks.
* Testes de filas.
* Testes de exportação.

---

# 21.2 Frontend

Tipos:

* Componentes.
* Stores.
* Services.
* Guards de rota.
* Renderização condicional.
* i18n.
* Modais.
* Toasts.

---

# 21.3 Carga

Usar k6 para simular:

* Criação de pagamentos.
* Listagem paginada.
* Recebimento de webhooks.
* Exportação.
* Login.

---

# 22. Qualidade e CI

# 22.1 Ferramentas sugeridas

* ESLint.
* Prettier.
* Husky.
* lint-staged.
* Commitlint.
* Conventional Commits.
* Dependabot ou Renovate.
* npm audit.
* CodeQL.
* Secret scanning.

---

# 22.2 Política de dependências

Não instalar bibliotecas:

* Sem manutenção há mais de 12 meses.
* Com vulnerabilidade high ou critical.
* Sem comunidade ativa.
* Sem documentação mínima.
* Com histórico problemático de segurança.

Dependências importantes devem ser justificadas em ADR quando necessário.

---

# 23. Docker

# 23.1 Serviços locais

```yaml
services:
  api:
  web:
  postgres:
  mongodb:
  redis:
  rabbitmq:
  mailpit:
  prometheus:
  grafana:
```

---

# 23.2 Regras

* `docker compose up --build` deve subir o ambiente.
* `.env.example` deve ser completo.
* README deve explicar portas.
* Volumes devem ser usados para bancos.
* Serviços de observabilidade devem ser opcionais, mas disponíveis.

---

# 24. Portas Locais Sugeridas

```text
Frontend:       5173
Backend API:    3000
PostgreSQL:     5432
MongoDB:        27017
Redis:          6379
RabbitMQ UI:    15672
RabbitMQ AMQP:  5672
Mailpit UI:     8025
Prometheus:     9090
Grafana:        3001
```

---

# 25. Variáveis de Ambiente

Exemplo de `.env.example`:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://ledgerflow:ledgerflow@postgres:5432/ledgerflow
MONGODB_URL=mongodb://mongodb:27017/ledgerflow
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ENCRYPTION_KEY=change-me-32-bytes-key

STRIPE_SECRET_KEY=sk_test_change_me
STRIPE_WEBHOOK_SECRET=whsec_change_me

SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

OTEL_SERVICE_NAME=ledgerflow-api
PROMETHEUS_ENABLED=true
DATADOG_ENABLED=false
```

---

# 26. Segurança de Logs

Não logar:

* Senhas.
* Tokens.
* Refresh tokens.
* API Keys.
* Secret keys.
* Dados completos de cartão.
* Documentos pessoais completos.
* Headers de autorização.
* Payloads sensíveis sem mascaramento.

---

# 27. Critérios Técnicos de Pronto

Uma funcionalidade só será considerada pronta quando:

* Código implementado.
* Testes mínimos criados.
* Permissões validadas.
* Erros tratados.
* Logs estruturados.
* Auditoria criada, se aplicável.
* Documentação atualizada.
* Fluxo validado localmente.
* Docker funcionando.
* Lint passando.
* Build passando.
* Não houver vulnerabilidade high ou critical conhecida.

---

# 28. Riscos Técnicos

## Risco 1 — Escopo grande demais

Mitigação:

* Trabalhar por fases.
* Priorizar MVP.
* Não implementar todos os gateways no início.

## Risco 2 — Complexidade do multi-gateway

Mitigação:

* Começar com Stripe.
* Manter interfaces pequenas.
* Documentar diferenças por provider.

## Risco 3 — Exportações pesadas

Mitigação:

* Usar streams.
* Processar assíncrono.
* Definir limites por tenant.

## Risco 4 — Observabilidade excessiva no início

Mitigação:

* Começar com logs estruturados.
* Depois adicionar OpenTelemetry.
* Depois Prometheus/Grafana.
* Datadog como opcional.

## Risco 5 — Segurança de webhooks

Mitigação:

* Validar assinatura.
* Usar raw body.
* Implementar Inbox.
* Garantir idempotência.

---

# 29. Decisões Técnicas Consolidadas

* Backend em NestJS.
* Frontend em Vue 3.
* TypeScript em toda a stack.
* PostgreSQL para dados transacionais.
* MongoDB para payloads e auditoria.
* Redis para cache, lock, rate limit e idempotência.
* RabbitMQ para mensageria.
* Prisma como ORM.
* Stripe como gateway inicial.
* Gateway desacoplado por Strategy + Factory.
* Docker Compose para ambiente local.
* Prometheus/Grafana como observabilidade local.
* Datadog opcional.
* Pino para logs.
* Tailwind para UI.
* Heroicons para ícones.
* Pinia para estado.
* JSON para traduções.
* Node.js Streams para CSV.
* ExcelJS streaming para XLSX.
* Swagger + Redoc + AsyncAPI para documentação.
* Outbox e Inbox para confiabilidade.

---

# 30. Implementation Notes

## Phase 2C
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

---

# 12. Database Foundation

* **Tenant**: Entidade raiz do isolamento lógico multitenant.
* **User**: Entidade que representa o usuário do sistema.
* **Role**: Papel do usuário no sistema (ex: admin, manager, viewer).
* **Permission**: Permissão granular (ex: payments:refund).
* **UserRole**: Vínculo entre User e Role.
* **RolePermission**: Vínculo entre Role e Permission.
* **RefreshToken**: Armazenamento seguro do refresh token em formato hash.
* **UserSession**: Registro de sessão ativa do usuário.
* **AuthAttempt**: Auditoria de tentativas de login, útil para bloqueios temporários de segurança.

---

# 13. Authentication Design

* **Login**: Realizado com e-mail e senha.
* **Senha**: Hasheada com bcrypt.
* **Access token JWT**: Curta duração para segurança.
* **Refresh token**: Seguro com hash armazenado no banco.
* **Sessão única por usuário**: Controlado via banco de dados e JWT sessionId.
* **Revogação**: Revogação de sessões anteriores e refresh tokens anteriores ao novo login.
* **Captura de IP e User-Agent**: Para fins de auditoria e segurança.
* **Registro de AuthAttempt**: Para monitoramento.
* **Bloqueio temporário**: Bloqueio após tentativas de login inválidas sequenciais.
* **Validações**: Validação rigorosa de usuário ativo, tenant ativo e sessão ativa via sessionId no JWT.

---

# 14. Authorization Design

* **Roles e Permissions**: Implementados no banco de dados.
* **JwtAuthGuard**: Protege rotas exigindo JWT válido.
* **PermissionGuard**: Intercepta requisições e verifica permissões granulares.
* **@RequirePermissions**: Decorator para definir permissões necessárias por rota.
* **@CurrentUser**: Decorator para injetar dados do usuário autenticado no controller.
* **@Public**: Decorator para liberar acesso anônimo em rotas específicas.
* **RBAC inicial**: Baseado em permissões extraídas do token e banco.
* **Fonte da Verdade**: Backend como fonte real e segura de autorização.

---

# 15. Frontend Authentication Design

* **Views**: LoginView e Dashboard (como placeholder inicial).
* **Layouts**: AuthLayout para páginas de login e AppLayout para a aplicação autenticada.
* **Store**: AuthStore usando Pinia para gerenciar o estado global de autenticação.
* **token-storage**: Módulo para centralizar persistência de tokens.
* **auth.service**: Interage com a API REST.
* **http-client (Axios)**: Cliente HTTP padronizado.
* **Interceptors**: 
  * Request interceptor para injetar o Bearer token.
  * Response interceptor para refresh automático silencioso do token.
* **Router guards**: Proteção de navegação. Rota `/login` é pública e `/dashboard` é privada.
* **PermissionGate**: Componente para renderização condicional baseada em permissões do usuário.
* **Persistência**: Manutenção de sessão entre reloads através de localStorage.
* **Logout**: Limpeza de sessão no frontend e notificação de revogação no backend.

---

# 16. API Documentation Design

* **OpenAPI**: Contrato oficial da API gerado através dos decorators do NestJS.
* **Swagger UI**: Disponível em `/api/docs` para testes em desenvolvimento.
* **Redoc**: Disponível em `/api/reference` como referência técnica e B2B.
* **OpenAPI JSON**: Disponível em `/api/openapi.json` para integrações.
* **DTOs**: Tipagem estrita documentada com `@ApiProperty`.
* **Controllers**: Organizados e agrupados usando `@ApiTags`.
* **Proteção**: Rotas protegidas documentadas adequadamente com `@ApiBearerAuth`.
* **Atualização**: Documentação atualizada lado a lado com cada nova feature.

## 5.10 Roles & Permissions Design
O sistema utiliza permissões globais do sistema (`Permission`) atreladas aos perfis (`Role`), permitindo controle granular baseado em RBAC.
A leitura de Roles é isolada pelo Tenant (`roles:manage`).
A leitura de Permissões requer `permissions:read`.
O frontend espelha as permissões ocultando itens de menu, mas o backend continua validando cada requisição com o `PermissionGuard`.
Na Fase 3C, foi introduzido o endpoint `GET /roles` para listar roles do tenant logado e `GET /roles/:id` para detalhar suas permissões associadas. As permissões são acessíveis publicamente via `GET /permissions`.

## 5.11 Tenant Settings Design
O sistema permite customizações e configurações básicas em nível de Tenant sem expor dados estruturais como `slug` e `active`.
Endpoint introduzidos na Fase 3C:
* `GET /tenants/current`: Busca a configuração atual de um tenant ativo a partir do `tenantId` contido no contexto seguro da sessão.
* `PATCH /tenants/current`: Atualiza nome (`name`) e `timezone`. Exige permissão `tenant:update`.

## Brand Identity / UI System

* assets oficiais em images/
* assets públicos do frontend em apps/web/public/brand/
* tokens visuais em main.css
* README usa images/
* frontend usa /brand/*

## 5.12 Customers Design
O domínio de Customers é gerenciado com total tenant isolation e controle por RBAC (`customers:read`, `customers:create`, `customers:update`).
Foi implementado o modelo `Customer`, além de usar o Repository Pattern para isolar as chamadas do Prisma.
Endpoints incluem suporte nativo a paginação (`page`, `perPage`), busca (`search`) e filtros (`status`, `type`), todos sanitizados via DTOs.
A deleção física de clientes não é permitida; a desativação se dá via *soft action* em `PATCH /customers/:id/status`.
Todas as operações de Customers registram auditorias (`AuditLog`) para `customer.created`, `customer.updated`, `customer.activated`, e `customer.deactivated`.

## 5.13 Password Recovery Design
O sistema suporta a redefinição de senhas enviando um e-mail com link contendo um token único seguro.
- O token puro NUNCA é salvo no banco nem nos logs; guarda-se apenas um hash SHA-256 no banco na tabela `PasswordResetToken`.
- O endpoint `POST /auth/forgot-password` retorna mensagens genéricas para evitar a enumeração de usuários.
- O endpoint `POST /auth/reset-password` exige o token original recebido por e-mail, revoga ativamente todos os `refresh tokens` e sessões (`UserSession`) do usuário logo após o reset bem-sucedido e zera bloqueios prévios.
- A comunicação de e-mail é feita via Mailpit em desenvolvimento por meio de um `EmailService` e uma interface `EmailProvider`.
- Auditorias registram os eventos `auth.password_recovery_requested` e `auth.password_reset_completed`.

## 5.14 Commerce Foundation e Entitlements

A Sprint 10.0.1 introduz os bounded contexts `catalog`, `inventory`, `orders`, `channels` e `financial-intelligence` como módulos Nest isolados, sem entidades de domínio operacional ainda.

Autorização passa a ter duas camadas para os novos módulos:

* `@RequirePermissions`: RBAC por role do usuário.
* `@RequireCapabilities`: entitlement comercial derivado da assinatura ativa do tenant.

O `CapabilityGuard` é executado no backend e consulta a policy central em `CapabilityPolicyService`. O frontend recebe `capabilities` no payload de autenticação para esconder menus e bloquear navegação como melhoria de UX, mas a autoridade final permanece no backend.

Mapeamento inicial sobre os planos existentes:

| Plano atual | Capabilities 10.0 iniciais |
|---|---|
| `FREE`, `STARTER` | nenhuma capability Commerce |
| `PROFESSIONAL` | `catalog.manage`, `inventory.manage`, `inventory.adjust`, `orders.manage`, `inventory.reports.read` |
| `ENTERPRISE`, `CUSTOM` | capabilities ERP Basic + channels + `financial.analytics.read` |

Endpoints foundation documentados no Swagger/Redoc/OpenAPI:

```text
GET /catalog/capabilities/status
GET /inventory/capabilities/status
GET /orders/capabilities/status
GET /channels/capabilities/status
GET /financial-intelligence/capabilities/status
```

Não há alteração AsyncAPI nesta sprint porque nenhum evento novo foi publicado.


### Payments Notes
* PaymentsView segue View -> Store -> Service -> HTTP Client.
* Paginação vem do backend.
* tenantId não é enviado pelo frontend.
* amount é convertido para centavos antes do request.
* Idempotency-Key é gerada somente em memória.
* RBAC frontend é UX; backend é autoridade final.
