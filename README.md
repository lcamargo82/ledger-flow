# LedgerFlow

## Enterprise Payment, Reconciliation & Observability Platform

**LedgerFlow** é uma plataforma B2B multitenant para gestão de pagamentos, conciliação financeira, auditoria, exportação de relatórios, webhooks, notificações e observabilidade.

O projeto simula um sistema corporativo de grande escala, inspirado em plataformas como Stripe, Asaas, Mercado Pago e gateways financeiros B2B, com foco em arquitetura, segurança, resiliência, rastreabilidade e experiência de usuário.

> Projeto desenvolvido para estudo avançado, portfólio técnico e simulação de ambiente enterprise.

---
# 1. Visão Geral

O LedgerFlow permite que empresas gerenciem cobranças, clientes, pagamentos, integrações com gateways, webhooks, relatórios financeiros e permissões de usuários em uma única plataforma.

O sistema começa com suporte ao **Stripe**, mas foi arquitetado para suportar múltiplos gateways de pagamento por tenant, como:

* Stripe.
* Asaas.
* Mercado Pago.
* Outros providers futuros.

O principal objetivo técnico é demonstrar uma arquitetura robusta usando:

* NestJS.
* Vue 3.
* PostgreSQL.
* MongoDB.
* Redis.
* RabbitMQ.
* Prisma.
* Docker.
* OpenTelemetry.
* Prometheus.
* Grafana.
* Datadog opcional.

---
# 2. Problema de Negócio

Empresas que recebem pagamentos por múltiplos canais enfrentam desafios como:

* Forte dependência de um único gateway.
* Dificuldade para migrar entre providers.
* Falhas em webhooks sem rastreabilidade.
* Falta de auditoria financeira.
* Exportações lentas ou instáveis.
* Controle frágil de permissões.
* Baixa visibilidade de erros e gargalos.
* Dificuldade para operar integrações externas.
* Falta de observabilidade técnica e de negócio.

O LedgerFlow simula uma solução para esses problemas com uma arquitetura preparada para ambientes corporativos.

---
# 3. Funcionalidades Planejadas

## Core

* Autenticação com JWT.
* Refresh token seguro.
* Multitenancy.
* RBAC e preparação para ABAC.
* Gestão de usuários.
* Gestão de permissões.
* Gestão de clientes.
* Gestão de pagamentos.
* Integração inicial com Stripe.
* Arquitetura desacoplada para múltiplos gateways.
* Webhooks inbound.
* Webhooks outbound.
* API Keys por tenant.
* Auditoria.

## Segurança

* Hash de senhas.
* Hash de refresh tokens.
* Hash de API Keys.
* Criptografia de credenciais externas.
* Validação de assinatura de webhooks.
* Assinatura HMAC de webhooks outbound.
* Rate limiting.
* CORS restrito.
* Helmet.
* Sanitização de logs.
* Isolamento por tenant.

## Assíncrono e Resiliência

* RabbitMQ.
* Outbox Pattern.
* Inbox Pattern.
* Retry.
* Dead Letter Queue.
* Workers.
* Idempotência.
* Locks distribuídos com Redis.

## Relatórios

* Exportação CSV.
* Exportação XLSX.
* Node.js Streams.
* ExcelJS em modo streaming.
* Jobs assíncronos.
* Notificações de relatório pronto.
* Expiração de arquivos.

## Frontend

* Vue 3.
* TypeScript.
* Pinia.
* Tailwind CSS.
* Heroicons.
* Componentização reutilizável.
* Toasts globais.
* Modais de confirmação.
* Internacionalização com JSON.
* Paginação vinda do backend.
* Lazy loading de rotas e componentes.

## Observabilidade

* Logs estruturados com Pino.
* TraceId por request.
* OpenTelemetry.
* Prometheus.
* Grafana.
* Métricas técnicas.
* Métricas de negócio.
* Datadog opcional.

---
# 4. Stack Técnica

## Backend

* NestJS.
* TypeScript.
* Prisma.
* PostgreSQL.
* MongoDB.
* Redis.
* RabbitMQ.
* JWT.
* Pino.
* OpenTelemetry.
* Swagger.
* Redoc.
* AsyncAPI.

## Frontend

* Vue 3.
* TypeScript.
* Vite.
* Pinia.
* Vue Router.
* Tailwind CSS.
* Heroicons.
* Axios.
* JSON-based i18n.

## Infraestrutura Local

* Docker.
* Docker Compose.
* PostgreSQL.
* MongoDB.
* Redis.
* RabbitMQ.
* Mailpit.
* Prometheus.
* Grafana.

## Testes e Qualidade

* Testes unitários.
* Testes de integração.
* Testes E2E.
* Testes de carga com k6.
* ESLint.
* Prettier.
* Husky.
* lint-staged.
* Commitlint.
* Dependabot ou Renovate.
* CodeQL.
* npm audit.

---
# 5. Arquitetura

O LedgerFlow será desenvolvido inicialmente como um **Monólito Modular Microservices-Ready**.

Essa decisão equilibra simplicidade operacional e maturidade arquitetural. O sistema começa como uma única aplicação NestJS modularizada, mas com separação clara de domínios para permitir futura extração para microserviços.

## Módulos principais

```text
apps/api/src/modules/
├── auth/
├── tenants/
├── users/
├── roles/
├── permissions/
├── customers/
├── payments/
├── payment-gateways/
├── webhooks/
├── reports/
├── notifications/
├── emails/
├── audit/
├── observability/
└── health/

```

## Estrutura interna sugerida por módulo

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
# 6. Estrutura do Projeto

```text
ledgerflow/
├── apps/
│   ├── api/
│   └── web/
├── docs/
│   ├── prd.md
│   ├── sdd.md
│   ├── implementation-plan.md
│   ├── backlog.md
│   ├── adr/
│   ├── diagrams/
│   └── runbooks/
├── docker-compose.yml
├── README.md
└── .env.example

```

---
# 7. Diagramas

Os diagramas estão disponíveis em `docs/diagrams`.

## Arquitetura

* [C4 Context](docs/diagrams/c4-context.md)
* [C4 Container](docs/diagrams/c4-container.md)
* [Database](docs/diagrams/database.md)
* [Queues](docs/diagrams/queues.md)
* [Observability](docs/diagrams/observability.md)

## Fluxos

* [Payment Flow](docs/diagrams/payment-flow.md)
* [Webhook Flow](docs/diagrams/webhook-flow.md)
* [Report Export Flow](docs/diagrams/report-export-flow.md)
* [Auth Flow](docs/diagrams/auth-flow.md)
* [Multitenancy Flow](docs/diagrams/multitenancy-flow.md)
* [Frontend Architecture](docs/diagrams/frontend-architecture.md)

---
# 8. Documentação

## Produto e Arquitetura

* [PRD — Product Requirements Document](docs/prd.md)
* [SDD — Software Design Document](docs/sdd.md)
* [Implementation Plan](docs/implementation-plan.md)
* [Technical Backlog](docs/backlog.md)

## ADRs — Architecture Decision Records

* [ADR-0001 — Architecture Style](docs/adr/0001-architecture-style.md)
* [ADR-0002 — Payment Gateway Abstraction](docs/adr/0002-payment-gateway-abstraction.md)
* [ADR-0003 — Outbox and Inbox Pattern](docs/adr/0003-outbox-inbox-pattern.md)
* [ADR-0004 — Observability Stack](docs/adr/0004-observability-stack.md)
* [ADR-0005 — Multitenancy Model](docs/adr/0005-multitenancy-model.md)
* [ADR-0006 — PostgreSQL and MongoDB](docs/adr/0006-postgresql-and-mongodb.md)
* [ADR-0007 — RabbitMQ for Async Processing](docs/adr/0007-rabbitmq-for-async-processing.md)
* [ADR-0008 — Error Handling Strategy](docs/adr/0008-error-handling-strategy.md)
* [ADR-0009 — Frontend Architecture](docs/adr/0009-frontend-architecture.md)
* [ADR-0010 — Dependency Governance](docs/adr/0010-dependency-governance.md)
* [ADR-0011 — Date and Timezone Strategy](docs/adr/0011-date-timezone-strategy.md)
* [ADR-0012 — API Documentation Strategy](docs/adr/0012-api-documentation-strategy.md)
* [ADR-0013 — Authentication and Authorization](docs/adr/0013-authentication-and-authorization.md)
* [ADR-0014 — Report Export Strategy](docs/adr/0014-report-export-strategy.md)
* [ADR-0015 — Email and Notification Strategy](docs/adr/0015-email-and-notification-strategy.md)
* [ADR-0016 — Security and Secrets Management](docs/adr/0016-security-and-secrets-management.md)
* [ADR-0017 — Testing Strategy](docs/adr/0017-testing-strategy.md)
* [ADR-0018 — Docker Local Development](docs/adr/0018-docker-local-development.md)

---
# 9. Como Rodar Localmente

## Pré-requisitos

* Docker.
* Docker Compose.
* Node.js LTS.
* npm ou pnpm.
* Git.

---
## 1. Clonar o repositório

HTTPS é recomendado para quem quer apenas clonar ou testar o projeto.
SSH é recomendado para quem já tem chave SSH configurada no GitHub e pretende contribuir/fazer push.

### Clonar via HTTPS

```bash
git clone https://github.com/lcamargo82/ledger-flow.git
cd ledger-flow

```

### Clonar via SSH

```bash
git clone git@github.com:lcamargo82/ledger-flow.git
cd ledger-flow

```

---
## 2. Criar arquivo `.env`

O projeto usa um único `.env` na raiz.
O `.env` real não deve ser versionado. O `.env.example` é o modelo seguro.
O `docker-compose.yml` injeta as variáveis nos containers via `env_file`.
O frontend só acessa variáveis prefixadas com `VITE_`.
Rodando via Docker, não é necessário criar `.env` dentro de `apps/api` ou `apps/web`.

```bash
cp .env.example .env

```

Exemplo com as principais variáveis:

```env
NODE_ENV=development
TZ=UTC
APP_NAME=LedgerFlow

APP_URL=<http://localhost:5180>
API_URL=<http://localhost:3010>
WEB_URL=<http://localhost:5180>

API_HOST=0.0.0.0
API_PORT=3000
HOST_API_PORT=3010

WEB_HOST=0.0.0.0
WEB_PORT=5173
HOST_WEB_PORT=5180

VITE_APP_NAME=LedgerFlow
VITE_APP_ENV=development
VITE_API_BASE_URL=<http://localhost:3010>
VITE_WS_BASE_URL=ws://localhost:3010
VITE_DEFAULT_LOCALE=pt-BR
VITE_DEFAULT_TIMEZONE=America/Sao_Paulo

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_PUBLIC_PORT=55432
POSTGRES_DB=ledgerflow
POSTGRES_USER=ledgerflow
POSTGRES_PASSWORD=ledgerflow
DATABASE_URL=postgresql://ledgerflow:ledgerflow@postgres:5432/ledgerflow?schema=public

MONGODB_HOST=mongodb
MONGODB_PORT=27017
MONGODB_PUBLIC_PORT=27018
MONGODB_DATABASE=ledgerflow
MONGODB_USERNAME=ledgerflow
MONGODB_PASSWORD=ledgerflow
MONGODB_URL=mongodb://ledgerflow:ledgerflow@mongodb:27017/ledgerflow?authSource=admin

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PUBLIC_PORT=6380
REDIS_URL=redis://redis:6379

RABBITMQ_HOST=rabbitmq
RABBITMQ_AMQP_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
RABBITMQ_PUBLIC_AMQP_PORT=5682
RABBITMQ_PUBLIC_MANAGEMENT_PORT=15682
RABBITMQ_DEFAULT_USER=ledgerflow
RABBITMQ_DEFAULT_PASS=ledgerflow
RABBITMQ_URL=amqp://ledgerflow:ledgerflow@rabbitmq:5672

MAILPIT_SMTP_PORT=1026
MAILPIT_UI_PORT=8026

SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM_NAME=LedgerFlow
SMTP_FROM_EMAIL=no-reply@ledgerflow.local

JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCK_MINUTES=15

ENCRYPTION_KEY=change-me-32-bytes-local-key-000

CORS_ORIGIN=<http://localhost:5180>
CORS_CREDENTIALS=true

HOST_PRISMA_STUDIO_PORT=5555
PRISMA_STUDIO_PORT=5555

SWAGGER_ENABLED=true
SWAGGER_PATH=api/docs
REDOC_ENABLED=true
REDOC_PATH=api/reference

PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9464
PROMETHEUS_PORT_PUBLIC=9091
GRAFANA_PORT=3002
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

DATADOG_ENABLED=false

```

Para a lista completa de variáveis, consulte o arquivo `.env.example`.

---
## 3. Subir e gerenciar ambiente local

**Subir projeto:**

```bash
docker compose up --build -d

```

**Ver containers:**

```bash
docker compose ps

```

**Ver logs gerais:**

```bash
docker compose logs -f

```

**Ver logs da API:**

```bash
docker compose logs -f api

```

**Ver logs do frontend:**

```bash
docker compose logs -f web

```

**Derrubar ambiente:**

```bash
docker compose down

```

**Derrubar ambiente e apagar volumes:**

```bash
docker compose down -v

```

**Build backend:**

```bash
docker compose exec api npm run build

```

**Build frontend:**

```bash
docker compose exec web npm run build

```

---
## 4. Acessar serviços locais

| Serviço             | URL/Host               |
| ------------------- | ---------------------- |
| Frontend            | <http://localhost:5180>  |
| Backend API         | <http://localhost:3010>  |
| PostgreSQL          | localhost:55432        |
| MongoDB             | localhost:27018        |
| Redis               | localhost:6380         |
| RabbitMQ Management | <http://localhost:15682> |
| Mailpit             | <http://localhost:8026>  |
| Prometheus          | <http://localhost:9091>  |
| Grafana             | <http://localhost:3002>  |
| Prisma Studio       | <http://localhost:5555>  |

**Health checks da API:**

```bash
curl <http://localhost:3010>/
curl <http://localhost:3010>/health
curl <http://localhost:3010>/health/liveness
curl <http://localhost:3010>/health/readiness

```

**Credenciais:**

* **RabbitMQ:** `ledgerflow` / `ledgerflow`
* **Grafana:** `admin` / `admin`
* **Usuário demo:** `owner@ledgerflow.local` / `ChangeMe123!`

---
## 5. Autenticação local

O projeto já possui fluxo inicial de autenticação com:

* Login.
* Access token JWT.
* Refresh token com hash no banco.
* Logout.
* Sessão única por usuário.
* Captura de IP e User-Agent.
* Registro de AuthAttempt.
* UserSession.
* Proteção de rotas no frontend.
* Router guards no Vue.
* Pinia Auth Store.
* Axios interceptor com refresh automático.

**Credenciais demo:**

```text
E-mail: owner@ledgerflow.local
Senha: ChangeMe123!

```

**Fluxo esperado:**

1. Acessar `<http://localhost:5180>`
2. Se não autenticado, redireciona para `/login`
3. Fazer login com `owner@ledgerflow.local` / `ChangeMe123!`
4. Após login, redireciona para `/dashboard`
5. Recarregar página mantém sessão
6. Logout limpa sessão local
7. Acessar `/dashboard` sem token redireciona para `/login`

---
# 10. Variáveis de Ambiente

*(Esta seção foi combinada com a etapa de criação do `.env` na seção de Como Rodar Localmente. Consulte a etapa 2 acima para mais detalhes.)*

---
# 11. Prisma

Os comandos do Prisma devem ser executados via Docker:

## Rodar migrations e gerar client

```bash
docker compose exec api npm run prisma:generate
docker compose exec api npm run prisma:migrate

```

## Rodar seed

```bash
docker compose exec api npm run prisma:seed

```

## Abrir Prisma Studio

```bash
docker compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555

```

> **Observação:** O Prisma Studio precisa ficar com o terminal aberto enquanto estiver sendo usado. Acesse em `<http://localhost:5555>`.

---
# 12. API Documentation

## Swagger UI

```text
http://localhost:3010/api/docs
```

Swagger UI é usado para testar endpoints durante desenvolvimento.

## Redoc

```text
http://localhost:3010/api/reference
```

Redoc é usado como referência de API mais limpa e profissional.

## OpenAPI JSON

```text
http://localhost:3010/api/openapi.json
```

OpenAPI JSON é o contrato bruto da API.

### Como testar endpoints protegidos

1. Fazer login em `POST /auth/login` (via API ou Swagger).
2. Copiar o valor do `accessToken` da resposta.
3. Abrir o Swagger UI em `/api/docs`.
4. Clicar no botão **Authorize**.
5. Informar o Bearer token copiado.
6. Testar endpoints protegidos, como o `GET /auth/me`.

## AsyncAPI

A documentação de eventos, filas e webhooks será mantida em:

```text
docs/asyncapi/

```

---
# 13. Segurança

O projeto aplica práticas de segurança como:

* JWT com access token curto.
* Refresh token com hash.
* Senhas com hash.
* API Keys com hash.
* Credenciais de gateways criptografadas.
* Validação de assinatura de webhooks.
* Assinatura HMAC de webhooks outbound.
* Rate limiting.
* CORS restrito.
* Helmet.
* Sanitização de logs.
* Erros amigáveis sem stack trace.
* Controle rígido de permissões.
* Isolamento multitenant.

---
# 14. Multitenancy

O LedgerFlow usa isolamento lógico por `tenantId`.

Toda entidade sensível deve possuir vínculo com o tenant.

Exemplos:

```text
payments.tenant_id
customers.tenant_id
users.tenant_id
api_keys.tenant_id
webhook_endpoints.tenant_id
export_jobs.tenant_id
notifications.tenant_id

```

O backend sempre deve usar o `tenantId` do contexto autenticado, nunca confiar em `tenantId` enviado livremente pelo frontend.

---
# 15. Payment Gateway Abstraction

O sistema usa Strategy + Factory para abstrair gateways de pagamento.

```text
IPaymentGateway
├── StripePaymentGateway
├── AsaasPaymentGateway
└── MercadoPagoPaymentGateway

```

O Stripe será o primeiro provider real.

O core de pagamento não deve importar SDK do Stripe diretamente. O SDK deve ficar isolado no adapter.

---
# 16. Outbox e Inbox

## Outbox Pattern

Usado para garantir que eventos internos não sejam perdidos.

Fluxo:

```text
Use Case
  ↓
PostgreSQL Transaction
  ↓
Salva entidade principal
  ↓
Salva OutboxEvent
  ↓
Commit
  ↓
Outbox Worker
  ↓
RabbitMQ

```

## Inbox Pattern

Usado para processar webhooks externos com segurança e idempotência.

Fluxo:

```text
Recebe webhook
  ↓
Valida assinatura
  ↓
Salva InboxEvent
  ↓
Verifica duplicidade
  ↓
Processa evento
  ↓
Atualiza entidades internas

```

---
# 17. Observabilidade

A stack de observabilidade inclui:

* Logs estruturados com Pino.
* TraceId por request.
* OpenTelemetry.
* Prometheus.
* Grafana.
* Datadog opcional.

## Métricas técnicas

* Latência HTTP.
* Taxa de erro.
* Tempo de queries.
* Uso de memória.
* Tamanho de filas.
* Mensagens em DLQ.
* Falhas de consumers.

## Métricas de negócio

* Pagamentos criados.
* Pagamentos aprovados.
* Pagamentos recusados.
* TPV.
* Taxa de aprovação.
* Webhooks enviados.
* Relatórios gerados.

---
# 18. Frontend Architecture

O frontend segue uma arquitetura baseada em:

* Views.
* Components.
* Services.
* Stores.
* Composables.
* Utils.
* Locales.

## Regras principais

* Views não chamam Axios diretamente.
* Services concentram chamadas HTTP.
* Stores concentram estado global.
* Componentes devem ser reutilizáveis.
* Rotas usam lazy loading.
* Componentes pesados carregam sob demanda.
* Tabelas usam paginação backend.
* Permissões controlam menus e botões.
* Backend continua sendo a fonte real de autorização.

---
# 19. Internacionalização

O sistema suporta traduções baseadas em arquivos JSON.

Idiomas iniciais:

* `pt-BR`
* `en-US`
* `es-ES`

Estrutura:

```text
apps/web/src/locales/
├── pt-BR.json
├── en-US.json
└── es-ES.json

```

---
# 20. Datas e Timezones

Estratégia:

* Persistir datas em UTC.
* Usar `TIMESTAMPTZ` no PostgreSQL.
* Trafegar datas em ISO 8601.
* Exibir datas conforme timezone do usuário ou tenant.
* Relatórios devem informar timezone utilizado.

Prioridade de timezone:

```text
1. Timezone do usuário
2. Timezone do tenant
3. Timezone do navegador
4. UTC

```

---
# 21. Relatórios e Exportações

O LedgerFlow suporta exportações:

* CSV.
* XLSX.

Estratégia:

* CSV com Node.js Streams.
* XLSX com ExcelJS streaming.
* Exportações grandes como jobs assíncronos.
* Notificação quando pronto.
* Arquivos com expiração.
* Respeito a tenant e permissões.

---
# 22. E-mails e Notificações

## E-mails

* Envio via fila RabbitMQ.
* Provider inicial: Mailpit/SMTP local.
* Providers futuros: SendGrid, Resend ou AWS SES.
* Templates por idioma.
* Retry em falhas.

## Notificações In-App

* Persistidas no PostgreSQL.
* Exibidas no frontend.
* Suporte a WebSocket.
* Possibilidade de marcar como lida.

---
# 23. Testes

Estratégia de testes:

* Unitários.
* Integração.
* E2E.
* Frontend component tests.
* Testes de segurança.
* Testes de multitenancy.
* Testes de idempotência.
* Testes de webhooks.
* Testes de filas.
* Testes de carga com k6.

Fluxos prioritários:

* Auth.
* RBAC.
* Multitenancy.
* Payments.
* Webhooks.
* Idempotência.
* Outbox.
* Inbox.
* Reports.

---
# 24. Qualidade e Governança de Dependências

O projeto deve evitar bibliotecas:

* Sem manutenção há mais de 12 meses.
* Com vulnerabilidades high ou critical.
* Sem documentação mínima.
* Com baixa confiabilidade.
* Desnecessárias.

Ferramentas planejadas:

* npm audit.
* Dependabot ou Renovate.
* CodeQL.
* Secret scanning.
* ESLint.
* Prettier.
* Husky.
* lint-staged.
* Commitlint.

---
# 25. Roadmap

## Fase 0 — Fundação (Concluída)

* Estrutura do projeto.
* NestJS.
* Vue 3.
* Docker Compose.
* Prisma.
* PostgreSQL.
* Documentação inicial.

## Fase 1A — Database Foundation (Concluída)

* Cadastro de tenant.
* Owner inicial.
* Isolamento por tenant.

## Fase 1B — Auth Schema Foundation (Concluída)

* Esquema de banco de dados para autenticação.
* Modelagem de usuários e sessões.

## Fase 2A — Backend Authentication Foundation (Concluída)

* Login com accessToken e refreshToken.
* Refresh de tokens e Logout.
* Sessão única por usuário (revogação de tokens e sessões).
* Captura de IP e User-Agent.
* Auditoria de AuthAttempt e gestão de UserSession.
* Bloqueio de conta por limite de tentativas (failedLoginAttempts).

## Fase 2B — Auth Guards & RBAC Foundation (Concluída)

* Proteção de rotas.
* Controle de acesso baseado em Roles.
* Permissões granulares.

## Fase 2C — Frontend Authentication Foundation (Concluída)

* Integração de login no Vue 3.
* Axios interceptor para refresh token automático.
* Auth Store no Pinia.
* Router guards.

## Fase 2D — API Documentation Foundation (Concluída)

* Swagger UI.
* Redoc.
* OpenAPI JSON.
* Documentação de endpoints auth e health.

## Fase 2E — UX Foundation (Concluída)

* Tratamento global de erros.
* Toasts.
* Modais.
* i18n.
* Estados de loading, erro e vazio.
* Rota de forgot-password adicionada.
* Componentes base definitivos (AppButton, AppInput, etc).

## Próxima Fase: Fase 3 — Users, Roles & Tenants Management

* CRUD de usuários.
* Gestão de roles e permissões.
* Tela de perfil.
* Gestão de tenant.

## Fase 3 — Payments MVP

* Clientes.
* Pagamentos.
* Stripe Adapter.
* Configuração de gateway.
* Paginação backend.

## Fase 4 — Webhooks

* Webhook Stripe.
* Validação de assinatura.
* Inbox Pattern.
* Idempotência.

## Fase 5 — Mensageria

* RabbitMQ.
* Outbox Pattern.
* Workers.
* Retry.
* DLQ.

## Fase 6 — E-mails e Notificações

* Mailpit.
* Email provider interface.
* Templates.
* Notificações in-app.
* WebSocket.

## Fase 7 — Relatórios

* ExportJob.
* CSV stream.
* XLSX streaming.
* Notificação de relatório pronto.

## Fase 8 — Dashboard

* KPIs financeiros.
* Gráficos.
* Componentização.
* Área de desenvolvedor.

## Fase 9 — Observabilidade

* Logs estruturados.
* TraceId.
* Prometheus.
* Grafana.
* OpenTelemetry.
* Datadog opcional.

## Fase 10 — Enterprise Features

* Webhooks outbound.
* Asaas Adapter.
* Mercado Pago Adapter.
* k6.
* README com prints.
* ADRs finais.
* Runbooks.

---
# 26. Definition of Done

Uma funcionalidade só será considerada pronta quando:

* Código foi implementado.
* Build passa.
* Lint passa.
* Erros são tratados.
* Permissões são validadas.
* Dados respeitam tenant.
* Logs não expõem dados sensíveis.
* Testes mínimos existem quando aplicável.
* Documentação foi atualizada.
* Fluxo foi validado localmente.
* Nenhuma vulnerabilidade high ou critical foi introduzida.
* Nenhuma dependência abandonada foi adicionada.

---
# 27. Status do Projeto

```text
Status atual: Fundação de autenticação e UX implementada.
Fase atual: UX Foundation concluída.
Próximo passo: Users, Roles & Tenants Management.

```

---
# 28. Autor

**Leandro Camargo Bahia**

Projeto desenvolvido como estudo avançado de arquitetura backend/frontend, sistemas distribuídos, pagamentos, observabilidade, segurança e práticas enterprise.

---
# 29. Licença

Este projeto é destinado a estudo e portfólio.

A licença será definida futuramente.
