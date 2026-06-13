# Implementation Plan - LedgerFlow

**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform
**Stack:** NestJS, Vue 3, TypeScript, PostgreSQL, MongoDB, Redis, RabbitMQ, Prisma, Docker, OpenTelemetry, Prometheus, Grafana, Datadog, Tailwind, Pinia, Heroicons
**Objetivo:** Construir uma plataforma B2B multitenant de pagamentos, conciliação financeira, auditoria e observabilidade, simulando um ambiente corporativo de grande escala.

---

# 1. Estratégia Geral de Implementação

O desenvolvimento será dividido em fases incrementais para evitar excesso de escopo e garantir entregas funcionais em cada etapa.

Cada fase deve entregar:

* Código funcional.
* Testes mínimos.
* Documentação atualizada.
* Critérios de aceite cumpridos.
* Evidências no README, como prints, diagramas ou exemplos de payload.
* Docker Compose funcionando.
* Commits organizados usando Conventional Commits.

---

# 2. Fase 0 — Fundação do Projeto

## Objetivo

Criar a base técnica do monorepo ou repositórios separados, configurar ambiente local, padrões de código, Docker e documentação inicial.

## Escopo

### Backend

* Criar projeto NestJS com TypeScript.
* Configurar estrutura modular.
* Configurar ESLint, Prettier e tsconfig.
* Configurar variáveis de ambiente.
* Configurar Dockerfile do backend.
* Configurar Prisma.
* Configurar conexão com PostgreSQL.
* Criar health check inicial.
* Criar endpoint `/health`.

### Frontend

* Criar projeto Vue 3 com Vite.
* Configurar TypeScript.
* Configurar Tailwind CSS.
* Configurar Pinia.
* Configurar Vue Router.
* Configurar Heroicons.
* Criar estrutura base de layouts.
* Criar página inicial de login.
* Criar Dockerfile do frontend.

### Infraestrutura local

Criar `docker-compose.yml` com:

* Backend NestJS.
* Frontend Vue.
* PostgreSQL.
* Redis.
* RabbitMQ.
* MongoDB.
* Mailpit.
* Prometheus.
* Grafana.

### Documentação

Criar arquivos:

* `README.md`
* `prd.md`
* `sdd.md`
* `implementation-plan.md`
* `adr/0001-architecture-style.md`
* `.env.example`

## Specs técnicas

### Estrutura inicial sugerida

```text
ledgerflow/
├── apps/
│   ├── api/
│   └── web/
├── docs/
│   ├── prd.md
│   ├── sdd.md
│   ├── implementation-plan.md
│   └── adr/
├── docker-compose.yml
├── README.md
└── .env.example
```

## Critérios de aceite

* O projeto deve subir localmente com `docker compose up --build`.
* O backend deve responder em `/health`.
* O frontend deve abrir uma tela inicial.
* PostgreSQL, Redis, MongoDB, RabbitMQ, Mailpit, Prometheus e Grafana devem subir sem erro.
* `.env.example` deve conter todas as variáveis necessárias.
* O README deve explicar como rodar o projeto.
* Nenhuma dependência abandonada há mais de 12 meses deve ser adicionada.
* O projeto deve passar em `lint`.
* O projeto deve passar em `build`.

---

# 3. Fase 1 — Autenticação, Multitenancy e RBAC

## Objetivo

Criar a base de segurança da aplicação: autenticação JWT, usuários, tenants e controle rígido de permissões.

## Escopo

### Backend

Implementar módulos:

* Auth.
* Users.
* Tenants.
* Roles.
* Permissions.
* Sessions.
* Refresh Tokens.

### Funcionalidades

* Cadastro inicial de tenant.
* Cadastro de owner.
* Login.
* Refresh token.
* Logout.
* Listagem de usuários do tenant.
* Criação de usuários por tenant.
* Associação de roles.
* Validação de permissões por rota.
* Isolamento de dados por `tenantId`.

### Roles iniciais

* Owner.
* Finance Operator.
* Support Viewer.
* Developer.

### Segurança

* Senhas com hash seguro.
* JWT com expiração curta.
* Refresh token persistido com hash.
* Guards globais de autenticação.
* Guards de permissão.
* Proteção contra acesso cross-tenant.
* Rate limit no login.
* Logs de tentativa de login.

### Frontend

* Tela de login.
* Tela de recuperação de senha visual.
* Layout autenticado.
* Store de autenticação com Pinia.
* Interceptor Axios para JWT.
* Controle de rotas protegidas.
* Menu lateral conforme permissões.
* Toast de sucesso, erro e warning.

## Specs técnicas

### Resposta padrão de autenticação

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "name": "Leandro",
    "email": "user@example.com",
    "tenantId": "uuid",
    "roles": ["OWNER"],
    "permissions": ["payments:create", "payments:read"]
  }
}
```

### Critérios de aceite

* Usuário deve conseguir criar conta e tenant.
* Usuário deve conseguir fazer login.
* Usuário autenticado deve acessar rotas protegidas.
* Usuário sem permissão deve receber erro `FORBIDDEN`.
* Usuário de um tenant não deve acessar dados de outro tenant.
* JWT expirado deve impedir acesso.
* Refresh token deve gerar novo access token.
* Logout deve invalidar refresh token.
* Menu do frontend deve respeitar permissões.
* Todas as respostas de erro devem retornar `code`, `message`, `traceId`, `statusCode`, `timestamp` e `path`.

---

# 4. Fase 2 — Catálogo de Erros, Toasts, Modais e i18n

## Objetivo

Criar uma experiência corporativa consistente para erros, feedback visual, confirmação de ações críticas e tradução da interface.

## Escopo

### Backend

* Criar `GlobalExceptionFilter`.
* Criar catálogo de erros.
* Criar padrão global de resposta.
* Adicionar `traceId` em toda request.
* Criar interceptors para logging.
* Padronizar erros de validação.
* Padronizar erros de regra de negócio.
* Padronizar erros externos.

### Frontend

* Criar sistema global de toast.
* Criar sistema global de modal de confirmação.
* Criar arquivos de tradução JSON.
* Criar helper `$t`.
* Criar store de locale com Pinia.
* Criar componente de seletor de idioma.
* Criar empty states.
* Criar loading states.
* Criar error states.

### Idiomas iniciais

* `pt-BR`
* `en-US`
* `es-ES`

## Specs técnicas

### Estrutura de erro

```json
{
  "code": "PAYMENT_GATEWAY_UNAVAILABLE",
  "message": "Não foi possível processar o pagamento neste momento.",
  "traceId": "01HZM9R7G2W6P",
  "statusCode": 503,
  "timestamp": "2026-06-12T18:30:00.000Z",
  "path": "/payments",
  "details": {
    "retryable": true
  }
}
```

### Estrutura de tradução

```json
{
  "errors": {
    "PAYMENT_GATEWAY_UNAVAILABLE": "Não foi possível processar o pagamento neste momento.",
    "FORBIDDEN": "Você não tem permissão para executar esta ação.",
    "VALIDATION_ERROR": "Verifique os campos informados."
  },
  "common": {
    "confirm": "Confirmar",
    "cancel": "Cancelar",
    "loading": "Carregando...",
    "success": "Operação realizada com sucesso."
  }
}
```

## Critérios de aceite

* Todo erro do backend deve seguir o padrão global.
* Nenhum erro técnico deve aparecer diretamente para o usuário.
* Todo erro deve conter `traceId`.
* O frontend deve exibir mensagens amigáveis.
* O frontend deve traduzir mensagens conforme idioma selecionado.
* Toasts devem funcionar para sucesso, erro, warning, info e loading.
* Modais devem ser obrigatórios em ações críticas.
* Componentes de erro, loading e empty state devem ser reutilizáveis.
* Nenhuma string fixa importante deve ficar hardcoded no frontend.

---

# 5. Fase 3 — Clientes, Cobranças e Stripe Adapter

## Objetivo

Implementar o primeiro fluxo real de negócio: criação de clientes e cobranças usando Stripe como gateway inicial, mas com arquitetura desacoplada.

## Escopo

### Backend

Criar módulos:

* Customers.
* Payments.
* Payment Gateways.
* Gateway Credentials.
* Payment Methods.
* Payment Events.

Implementar:

* Interface `IPaymentGateway`.
* Adapter `StripePaymentGateway`.
* Factory de gateways.
* Criação de customer local.
* Criação de payment local.
* Criação de payment no Stripe.
* Persistência do status do pagamento.
* Salvar payload bruto no MongoDB.
* Auditoria do fluxo de pagamento.

### Frontend

* Tela de clientes.
* Tela de criação de cliente.
* Tela de cobranças.
* Tela de criação de cobrança.
* Tela de detalhes da cobrança.
* Status visual da cobrança.
* Paginação backend.
* Filtros iniciais.
* Modal de confirmação para criar cobrança.
* Toasts de retorno.

## Specs técnicas

### Interface de gateway

```typescript
export interface IPaymentGateway {
  createCustomer(input: CreateGatewayCustomerInput): Promise<GatewayCustomerResponse>;
  createPayment(input: CreatePaymentInput): Promise<GatewayPaymentResponse>;
  refundPayment(input: RefundPaymentInput): Promise<GatewayRefundResponse>;
}
```

### Providers planejados

* Stripe.
* Asaas.
* Mercado Pago.

### Regras

* A regra de negócio não pode depender diretamente do SDK do Stripe.
* O Stripe deve existir apenas dentro do adapter.
* O tenant deve possuir configuração de gateway.
* Cada pagamento deve registrar provider usado.
* Cada pagamento deve possuir status interno independente do status externo.
* Payload bruto deve ir para MongoDB.
* Dados normalizados devem ir para PostgreSQL.

## Critérios de aceite

* Deve ser possível cadastrar cliente.
* Deve ser possível criar cobrança.
* Deve ser possível processar cobrança via Stripe Sandbox.
* Deve ser possível listar cobranças com paginação backend.
* Deve ser possível ver detalhes da cobrança.
* O core da aplicação não deve importar SDK do Stripe diretamente.
* O adapter Stripe deve implementar a interface padrão.
* O sistema deve salvar resposta bruta do Stripe no MongoDB.
* O sistema deve salvar dados transacionais no PostgreSQL.
* Erros do Stripe devem ser convertidos para erros amigáveis.
* Todas as ações devem gerar logs estruturados.

---

# 6. Fase 4 — Webhooks, Inbox Pattern e Idempotência

## Objetivo

Processar eventos externos de pagamento com segurança, validação de assinatura, idempotência e auditoria.

## Escopo

### Backend

* Criar endpoint de webhook Stripe.
* Validar assinatura `stripe-signature`.
* Configurar raw body no NestJS.
* Criar tabela `inbox_events`.
* Salvar evento recebido.
* Criar chave de idempotência.
* Ignorar eventos duplicados.
* Processar eventos relevantes.
* Atualizar status de pagamento.
* Registrar auditoria.
* Publicar eventos internos.

### Eventos Stripe iniciais

* `payment_intent.succeeded`
* `payment_intent.payment_failed`
* `charge.refunded`
* `customer.subscription.created`
* `customer.subscription.deleted`

## Specs técnicas

### Fluxo

```text
Stripe
  ↓
Webhook Controller
  ↓
Validação de assinatura
  ↓
Inbox Event
  ↓
Idempotency Check
  ↓
Processamento
  ↓
Atualização do PostgreSQL
  ↓
Auditoria no MongoDB
  ↓
Evento interno
```

## Critérios de aceite

* Webhook sem assinatura deve ser rejeitado.
* Webhook com assinatura inválida deve ser rejeitado.
* Webhook válido deve ser salvo em `inbox_events`.
* Webhook duplicado não deve processar duas vezes.
* Pagamento deve mudar de status após evento válido.
* Payload bruto deve ser salvo.
* Evento processado deve registrar data de processamento.
* Falhas devem ficar registradas para reprocessamento.
* Resposta ao Stripe deve ser rápida.
* Toda execução deve possuir `traceId`.

---

# 7. Fase 5 — RabbitMQ, Outbox Pattern e Processamento Assíncrono

## Objetivo

Adicionar robustez corporativa usando mensageria, garantindo consistência entre banco e filas.

## Escopo

### Backend

* Configurar RabbitMQ.
* Criar módulo de mensageria.
* Criar tabela `outbox_events`.
* Criar worker de outbox.
* Criar consumers.
* Criar retry com backoff.
* Criar Dead Letter Exchange.
* Criar logs de eventos.
* Criar eventos internos de domínio.

### Eventos iniciais

* `payment.created`
* `payment.approved`
* `payment.failed`
* `refund.created`
* `email.send.requested`
* `webhook.dispatch.requested`
* `report.export.requested`

## Specs técnicas

### Fluxo Outbox

```text
Use case cria pagamento
  ↓
PostgreSQL transaction
  ↓
Salva payment
  ↓
Salva outbox_event
  ↓
Commit
  ↓
Outbox Worker
  ↓
RabbitMQ
  ↓
Consumer
```

## Critérios de aceite

* Evento deve ser salvo no banco dentro da mesma transação da operação principal.
* Worker deve publicar evento pendente no RabbitMQ.
* Evento publicado deve ser marcado como publicado.
* Falha de publicação deve ser retentada.
* Evento não deve ser publicado duplicado.
* Consumer deve tratar erro sem derrubar aplicação.
* Dead Letter Exchange deve receber mensagens com falha definitiva.
* Logs devem mostrar ciclo de vida da mensagem.
* README deve documentar filas, exchanges e routing keys.

---

# 8. Fase 6 — E-mails Transacionais e Notificações In-App

## Objetivo

Implementar comunicação com usuários por e-mail e notificações internas, sempre de forma assíncrona e desacoplada.

## Escopo

### Backend

* Criar módulo Notifications.
* Criar módulo Emails.
* Criar interface `IEmailProvider`.
* Criar adapter SMTP com Mailpit.
* Criar templates por idioma.
* Criar consumer de e-mail.
* Criar notificações in-app.
* Criar WebSocket Gateway.
* Criar persistência de notificações.

### Frontend

* Criar central de notificações.
* Criar badge de notificações não lidas.
* Criar toast para eventos em tempo real.
* Criar tela de histórico de notificações.
* Criar estado com Pinia.

## Eventos com e-mail

* Cadastro criado.
* Reset de senha.
* Pagamento aprovado.
* Pagamento recusado.
* Relatório pronto.
* Webhook falhou definitivamente.
* API key criada.
* Gateway alterado.

## Critérios de aceite

* E-mail deve ser enviado via fila.
* Mailpit deve receber e-mails localmente.
* Template deve respeitar idioma do usuário.
* Falha de envio deve ir para retry.
* E-mails não devem conter dados sensíveis.
* Notificação in-app deve aparecer no frontend.
* Usuário deve conseguir marcar notificação como lida.
* WebSocket deve notificar eventos críticos.
* README deve mostrar como acessar Mailpit.

---

# 9. Fase 7 — Relatórios, CSV/XLSX e Node.js Streams

## Objetivo

Criar exportações pesadas de forma escalável, sem carregar milhões de registros em memória.

## Escopo

### Backend

* Criar módulo Reports.
* Criar solicitação de exportação.
* Criar processamento assíncrono por fila.
* Criar exportação CSV via stream.
* Criar exportação XLSX com ExcelJS streaming.
* Criar status de exportação.
* Criar link de download temporário.
* Criar limpeza de arquivos antigos.
* Criar limites por tenant.

### Frontend

* Tela de relatórios.
* Formulário de filtro.
* Solicitação de exportação.
* Status da exportação.
* Download do arquivo.
* Toast quando relatório ficar pronto.
* Modal de confirmação para exportações pesadas.

## Specs técnicas

### Status de relatório

* `PENDING`
* `PROCESSING`
* `COMPLETED`
* `FAILED`
* `EXPIRED`

## Critérios de aceite

* Relatórios pequenos podem ser baixados diretamente.
* Relatórios grandes devem ser processados de forma assíncrona.
* CSV deve ser gerado via stream.
* XLSX deve ser gerado com ExcelJS streaming.
* O processo não deve carregar todos os registros em memória.
* Usuário deve ver status do relatório.
* Usuário deve receber notificação quando o relatório estiver pronto.
* Arquivos expirados devem ser removidos.
* Exportação deve respeitar permissões.
* Exportação deve respeitar tenant.
* Deve haver teste com volume alto de registros simulados.

---

# 10. Fase 8 — Dashboard Financeiro e Componentização Avançada

## Objetivo

Construir um dashboard moderno, componentizado, performático e preparado para crescimento.

## Escopo

### Frontend

Criar componentes:

* `KpiCard`
* `DataTable`
* `Pagination`
* `FilterBar`
* `DateRangePicker`
* `StatusBadge`
* `ConfirmModal`
* `ToastContainer`
* `EmptyState`
* `LoadingState`
* `ErrorState`
* `DashboardChart`
* `NotificationBell`
* `PermissionGuard`
* `PageHeader`
* `ActionMenu`

### Telas

* Dashboard financeiro.
* Clientes.
* Cobranças.
* Relatórios.
* Webhooks.
* Desenvolvedores.
* Configurações.
* Usuários e permissões.

### Regras

* Componentes devem ser reutilizáveis.
* Views devem carregar componentes sob demanda.
* Menus ocultos não devem renderizar componentes.
* Tabelas devem usar paginação backend.
* Estados globais devem ficar no Pinia.
* Chamadas HTTP devem ficar em services.
* Nenhuma view deve chamar Axios diretamente.

## Critérios de aceite

* Dashboard deve exibir KPIs reais da API.
* Componentes devem ser reutilizados em mais de uma tela.
* Rotas devem usar lazy loading.
* Tabs internas devem usar `defineAsyncComponent` quando fizer sentido.
* Tabelas devem ser paginadas pelo backend.
* Filtros devem refletir query params quando aplicável.
* Layout deve funcionar em desktop.
* Toasts, modais e loaders devem ser padronizados.
* Nenhuma tela deve conter regra de API diretamente.
* Build do frontend deve passar sem warnings críticos.

---

# 11. Fase 9 — Observabilidade, Logs e Métricas

## Objetivo

Implementar uma stack de observabilidade compatível com sistemas corporativos.

## Escopo

### Backend

* Configurar logs estruturados com Pino.
* Adicionar `traceId` nos logs.
* Configurar OpenTelemetry.
* Instrumentar HTTP.
* Instrumentar Prisma.
* Instrumentar RabbitMQ.
* Expor métricas para Prometheus.
* Criar métricas técnicas.
* Criar métricas de negócio.
* Configurar Datadog opcional.

### Infra

* Prometheus.
* Grafana.
* Dashboards.
* Alertas básicos.
* Datadog Agent opcional.

### Métricas técnicas

* Latência HTTP.
* Taxa de erro.
* Uso de CPU/memória.
* Tempo de queries.
* Tamanho das filas.
* Falhas de consumers.
* Retries.
* DLQ count.

### Métricas de negócio

* Total de pagamentos criados.
* Total de pagamentos aprovados.
* Total de pagamentos recusados.
* TPV.
* Taxa de aprovação.
* Tempo médio de processamento.
* Webhooks enviados com sucesso.
* Webhooks com falha.

## Critérios de aceite

* Toda request deve ter `traceId`.
* Logs devem ser JSON.
* Logs devem conter contexto mínimo: `traceId`, `tenantId`, `userId`, `route`, `statusCode`.
* Prometheus deve coletar métricas.
* Grafana deve exibir dashboard técnico.
* Grafana deve exibir dashboard de negócio.
* Erros devem aparecer nos logs com stack interna.
* Stack não deve ser retornada ao frontend.
* Datadog deve ser documentado como opcional.
* README deve conter prints dos dashboards.

---

# 12. Fase 10 — Webhooks de Saída para Clientes

## Objetivo

Permitir que clientes externos recebam eventos do LedgerFlow de forma segura e resiliente.

## Escopo

### Backend

* Criar cadastro de endpoints de webhook por tenant.
* Criar assinatura HMAC dos webhooks enviados.
* Criar fila de envio.
* Criar retry com backoff.
* Criar DLQ.
* Criar histórico de tentativas.
* Criar tela de logs de webhooks.
* Criar botão de reprocessar webhook.

### Frontend

* Tela de configuração de webhooks.
* Tela de histórico de entregas.
* Visualização de payload.
* Visualização de status code.
* Botão de retry.
* Modal de confirmação para retry.
* Documentação de assinatura.

## Critérios de aceite

* Tenant deve conseguir cadastrar endpoint.
* Sistema deve assinar payload enviado.
* Cliente deve receber header de assinatura.
* Falha deve gerar retry.
* Falha definitiva deve ir para DLQ.
* Histórico deve mostrar todas as tentativas.
* Usuário developer deve poder reprocessar webhook.
* Usuário sem permissão não deve reprocessar.
* Payload deve ser exibido com segurança no frontend.
* Segredos de webhook devem ser criptografados.

---

# 13. Fase 11 — Multi-Gateway Real

## Objetivo

Expandir a arquitetura para suportar mais de um gateway de pagamento por tenant.

## Escopo

### Backend

* Criar adapter Asaas.
* Criar adapter Mercado Pago.
* Criar configuração de gateway por tenant.
* Criar criptografia de credenciais.
* Criar seleção dinâmica de provider.
* Criar fallback manual.
* Criar logs por provider.
* Criar normalização de status.
* Criar documentação de particularidades.

### Frontend

* Tela de gateways.
* Cadastro de credenciais por provider.
* Teste de conexão.
* Definição de provider padrão.
* Histórico de alteração de gateway.
* Modal de confirmação de troca de gateway.

## Critérios de aceite

* Tenant deve poder escolher Stripe, Asaas ou Mercado Pago.
* Cada provider deve implementar a interface padrão.
* Credenciais devem ser criptografadas.
* Troca de provider deve exigir confirmação.
* Pagamentos novos devem usar provider configurado.
* Pagamentos antigos devem manter provider original.
* Status externos devem ser normalizados para status internos.
* Falhas por provider devem ser auditadas.
* Documentação deve explicar limites de cada provider.
* Core da aplicação não deve depender diretamente de nenhum provider.

---

# 14. Fase 12 — Testes, Qualidade e Segurança

## Objetivo

Elevar a confiabilidade do projeto com testes automatizados, análise estática, segurança e carga.

## Escopo

### Backend

* Testes unitários.
* Testes de integração.
* Testes e2e.
* Testes com Testcontainers.
* Testes de RBAC.
* Testes de isolamento multitenant.
* Testes de idempotência.
* Testes de webhook.
* Testes de fila.
* Testes de exportação.

### Frontend

* Testes de componentes.
* Testes de stores.
* Testes de services.
* Testes de guards de rota.
* Testes de renderização condicional.
* Testes de i18n.

### Segurança

* `npm audit`.
* Dependabot ou Renovate.
* CodeQL.
* Secret scanning.
* Validação de headers.
* CORS restrito.
* Rate limiting.
* Helmet no NestJS.
* Sanitização de inputs.
* Proteção contra XSS.
* Proteção contra CSRF onde aplicável.

### Carga

* Criar scripts k6.
* Simular criação de pagamentos.
* Simular listagem paginada.
* Simular webhook.
* Simular exportação pesada.
* Registrar resultados no README.

## Critérios de aceite

* Testes unitários devem passar.
* Testes e2e principais devem passar.
* Testes de RBAC devem provar bloqueio de acesso indevido.
* Testes multitenant devem provar isolamento de dados.
* Webhook duplicado não deve duplicar processamento.
* Exportação grande não deve estourar memória.
* `npm audit` não deve ter vulnerabilidades high ou critical.
* Dependências abandonadas há mais de 12 meses não devem ser aprovadas.
* k6 deve gerar relatório básico.
* README deve conter evidências dos testes.

---

# 15. Fase 13 — Documentação Final e Apresentação de Portfólio

## Objetivo

Transformar o projeto em uma peça forte de portfólio técnico.

## Escopo

### Documentação obrigatória

* README principal.
* PRD.
* SDD.
* Implementation Plan.
* ADRs.
* Swagger.
* Redoc.
* AsyncAPI.
* C4 Model.
* Diagrama de banco.
* Diagrama de filas.
* Diagrama de observabilidade.
* Runbook.
* Guia de troubleshooting.
* Guia de configuração local.
* Collection Postman/Insomnia.

### README deve conter

* Visão geral do produto.
* Problema de negócio.
* Arquitetura.
* Stack.
* Como rodar.
* Como testar.
* Como acessar serviços locais.
* Prints do frontend.
* Prints do Grafana.
* Prints do RabbitMQ.
* Prints do Mailpit.
* Exemplos de payload.
* Decisões técnicas.
* Segurança aplicada.
* Limitações conhecidas.
* Roadmap futuro.

## Critérios de aceite

* Qualquer pessoa deve conseguir rodar o projeto localmente.
* README deve explicar o valor do projeto em até 2 minutos.
* Documentação deve mostrar maturidade técnica.
* Swagger deve estar funcional.
* Redoc deve estar funcional.
* AsyncAPI deve documentar filas e eventos.
* C4 deve explicar arquitetura.
* ADRs devem justificar decisões importantes.
* Projeto deve parecer produto real, não apenas estudo.
