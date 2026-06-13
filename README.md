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

```bash
git clone https://github.com/seu-usuario/ledgerflow.git
cd ledgerflow
```

---

## 2. Criar arquivo `.env`

```bash
cp .env.example .env
```

Ajuste as variáveis conforme necessário.

---

## 3. Subir ambiente local

```bash
docker compose up --build
```

---

## 4. Acessar serviços locais

```text
Frontend:       http://localhost:5173
Backend API:    http://localhost:3000
Swagger:        http://localhost:3000/api/docs
Redoc:          http://localhost:3000/api/reference
RabbitMQ UI:    http://localhost:15672
Mailpit:        http://localhost:8025
Prometheus:     http://localhost:9090
Grafana:        http://localhost:3001
```

---

# 10. Variáveis de Ambiente

Exemplo base:

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

OTEL_SERVICE_NAME=ledgerflow-api
PROMETHEUS_ENABLED=true
DATADOG_ENABLED=false
```

> Nunca versionar o arquivo `.env` real.

---

# 11. Prisma

## Rodar migrations

```bash
npm run prisma:migrate
```

## Rodar seed

```bash
npm run prisma:seed
```

## Abrir Prisma Studio

```bash
npm run prisma:studio
```

---

# 12. API Documentation

## Swagger

```text
http://localhost:3000/api/docs
```

Usado para testar rotas em desenvolvimento.

## Redoc

```text
http://localhost:3000/api/reference
```

Usado como documentação mais limpa e profissional da API.

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

## Fase 0 — Fundação

* Estrutura do projeto.
* NestJS.
* Vue 3.
* Docker Compose.
* Prisma.
* PostgreSQL.
* Documentação inicial.

## Fase 1 — Auth, Tenancy e RBAC

* Cadastro de tenant.
* Owner inicial.
* Login.
* Refresh token.
* Guards.
* Permissões.
* Isolamento por tenant.

## Fase 2 — UX Foundation

* Tratamento global de erros.
* Toasts.
* Modais.
* i18n.
* Estados de loading, erro e vazio.

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
Status atual: Planejamento arquitetural e documentação inicial.
Próximo passo: Fundação do repositório e setup local.
```

---

# 28. Autor

**Leandro Camargo Bahia**

Projeto desenvolvido como estudo avançado de arquitetura backend/frontend, sistemas distribuídos, pagamentos, observabilidade, segurança e práticas enterprise.

---

# 29. Licença

Este projeto é destinado a estudo e portfólio.

A licença será definida futuramente.
