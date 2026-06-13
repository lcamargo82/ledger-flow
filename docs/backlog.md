# Backlog Técnico — LedgerFlow

**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform
**Formato:** Épicos, issues e subtasks
**Status:** Pronto para execução inicial
**Objetivo:** Organizar o desenvolvimento em entregas incrementais, rastreáveis e testáveis.

---

# 1. Convenção de Prioridade

## P0 — Obrigatório para o MVP

Sem isso o produto não funciona ou não demonstra o núcleo técnico.

## P1 — Muito importante

Agrega maturidade enterprise e deve entrar logo após o MVP.

## P2 — Evolução avançada

Importante para deixar o projeto mais robusto, mas pode ser feito após o fluxo principal estar funcionando.

## P3 — Futuro

Melhorias, refinamentos ou expansões.

---

# 2. Convenção de Status

```text
TODO
IN_PROGRESS
IN_REVIEW
BLOCKED
DONE
```

---

# 3. Convenção de Branches

```text
feature/LF-001-project-bootstrap
feature/LF-002-docker-compose
fix/LF-010-auth-refresh-token
docs/LF-020-update-readme
refactor/LF-030-payment-gateway-factory
```

---

# 4. Convenção de Commits

Usar Conventional Commits:

```text
feat: add tenant authentication
fix: prevent cross-tenant payment access
docs: add payment gateway ADR
test: add webhook idempotency tests
refactor: isolate stripe adapter
chore: configure docker compose
```

---

# 5. Labels Sugeridas

```text
backend
frontend
infra
security
docs
database
observability
payments
webhooks
reports
tests
good-first-task
blocked
priority:p0
priority:p1
priority:p2
priority:p3
```

---

# 6. Milestones

## M0 — Project Foundation

Base do projeto, Docker, estrutura, documentação inicial.

## M1 — Auth, Tenancy & Permissions

Autenticação, tenants e permissões rígidas.

## M2 — UX Foundation

Erros amigáveis, toasts, modais, i18n e layout base.

## M3 — Payments MVP

Clientes, cobranças e Stripe Adapter.

## M4 — Webhooks & Idempotency

Webhooks inbound, Inbox Pattern e idempotência.

## M5 — Async Processing

RabbitMQ, Outbox Pattern, workers e DLQ.

## M6 — Notifications & Emails

E-mails transacionais e notificações in-app.

## M7 — Reports & Streams

Exportações CSV/XLSX com processamento pesado.

## M8 — Dashboard & Frontend Enterprise

Dashboard financeiro, componentes avançados e telas principais.

## M9 — Observability

Logs, traces, métricas, Prometheus, Grafana e Datadog opcional.

## M10 — Outbound Webhooks

Webhooks enviados para clientes.

## M11 — Multi-Gateway

Asaas, Mercado Pago e configuração dinâmica por tenant.

## M12 — Tests, Security & Portfolio

Testes, carga, documentação final e polimento de portfólio.

---

# 7. Épicos e Issues

---

# EPIC LF-E00 — Fundação do Projeto

## Objetivo

Criar a base técnica do projeto, estrutura de pastas, Docker, documentação inicial e padrões de qualidade.

---

## LF-001 — Criar estrutura inicial do repositório

**Prioridade:** P0
**Tipo:** Infra / Docs
**Milestone:** M0

### Descrição

Criar a estrutura base do projeto com pastas para API, Web e documentação.

### Subtasks

* Criar pasta `apps/api`.
* Criar pasta `apps/web`.
* Criar pasta `docs`.
* Criar pasta `docs/adr`.
* Criar pasta `docs/diagrams`.
* Criar pasta `docs/runbooks`.
* Adicionar `README.md`.
* Adicionar `.gitignore`.
* Adicionar `.env.example`.

### Critérios de aceite

* Estrutura base deve existir no repositório.
* README inicial deve explicar o objetivo do projeto.
* `.env.example` deve estar presente.
* Pastas de documentação devem estar criadas.

---

## LF-002 — Criar projeto NestJS

**Prioridade:** P0
**Tipo:** Backend
**Milestone:** M0

### Descrição

Criar aplicação backend usando NestJS com TypeScript.

### Subtasks

* Inicializar projeto NestJS em `apps/api`.
* Configurar TypeScript.
* Configurar ESLint.
* Configurar Prettier.
* Criar módulo `HealthModule`.
* Criar endpoint `GET /health`.
* Criar estrutura `common`, `config`, `database` e `modules`.

### Critérios de aceite

* API deve iniciar localmente.
* Endpoint `/health` deve retornar status OK.
* Build do backend deve passar.
* Lint do backend deve passar.

---

## LF-003 — Criar projeto Vue 3

**Prioridade:** P0
**Tipo:** Frontend
**Milestone:** M0

### Descrição

Criar aplicação frontend usando Vue 3, Vite e TypeScript.

### Subtasks

* Inicializar projeto Vue em `apps/web`.
* Configurar TypeScript.
* Configurar Vue Router.
* Configurar Pinia.
* Configurar Tailwind CSS.
* Configurar Heroicons.
* Criar layout inicial.
* Criar página temporária de login.
* Criar página temporária de dashboard.

### Critérios de aceite

* Frontend deve iniciar localmente.
* Tailwind deve funcionar.
* Router deve navegar entre login e dashboard.
* Build do frontend deve passar.
* Lint do frontend deve passar.

---

## LF-004 — Configurar Docker Compose

**Prioridade:** P0
**Tipo:** Infra
**Milestone:** M0

### Descrição

Criar ambiente local reproduzível via Docker Compose.

### Serviços

* API.
* Web.
* PostgreSQL.
* MongoDB.
* Redis.
* RabbitMQ.
* Mailpit.
* Prometheus.
* Grafana.

### Critérios de aceite

* `docker compose up --build` deve subir todos os serviços.
* PostgreSQL deve aceitar conexão.
* MongoDB deve aceitar conexão.
* Redis deve aceitar conexão.
* RabbitMQ UI deve abrir.
* Mailpit UI deve abrir.
* Prometheus deve abrir.
* Grafana deve abrir.
* README deve documentar portas locais.

---

## LF-005 — Configurar Prisma e PostgreSQL

**Prioridade:** P0
**Tipo:** Backend / Database
**Milestone:** M0

### Descrição

Configurar Prisma como ORM principal do PostgreSQL.

### Subtasks

* Instalar Prisma.
* Criar `schema.prisma`.
* Configurar `DATABASE_URL`.
* Criar `PrismaService`.
* Criar primeira migration.
* Criar script de seed inicial.
* Criar documentação básica de migrations.

### Critérios de aceite

* Prisma deve conectar no PostgreSQL.
* Migration inicial deve rodar.
* Seed inicial deve rodar.
* API deve conseguir acessar PrismaService.

---

## LF-006 — Adicionar PRD, SDD e Implementation Plan

**Prioridade:** P0
**Tipo:** Docs
**Milestone:** M0

### Descrição

Adicionar documentação consolidada do produto e da arquitetura.

### Subtasks

* Criar `docs/prd.md`.
* Criar `docs/sdd.md`.
* Criar `docs/implementation-plan.md`.
* Criar `docs/backlog.md`.

### Critérios de aceite

* Documentos devem estar versionados.
* README deve referenciar os documentos.
* Documentos devem estar alinhados com o escopo atual.

---

# EPIC LF-E01 — Autenticação, Tenants e Permissões

## Objetivo

Implementar autenticação segura, isolamento multitenant e controle rígido de permissões.

---

## LF-010 — Criar modelos iniciais de Auth e Tenancy

**Prioridade:** P0
**Tipo:** Backend / Database
**Milestone:** M1

### Entidades

* Tenant.
* User.
* Role.
* Permission.
* UserRole.
* RolePermission.
* RefreshToken.

### Critérios de aceite

* Todas as entidades devem existir no Prisma.
* Todas as entidades críticas devem possuir `id`, `createdAt` e `updatedAt`.
* Entidades associadas ao tenant devem possuir `tenantId`.
* Migration deve executar com sucesso.

---

## LF-011 — Implementar cadastro inicial de tenant e owner

**Prioridade:** P0
**Tipo:** Backend
**Milestone:** M1

### Descrição

Permitir criação de um tenant com usuário owner inicial.

### Subtasks

* Criar DTO de criação.
* Validar e-mail.
* Validar senha.
* Criar tenant.
* Criar usuário owner.
* Criar role Owner.
* Associar permissões iniciais.
* Retornar dados básicos.

### Critérios de aceite

* Deve ser possível criar um tenant.
* Deve ser criado um usuário owner.
* Senha deve ser armazenada com hash.
* E-mail duplicado deve retornar erro amigável.
* Erro deve conter `code`, `message` e `traceId`.

---

## LF-012 — Implementar login com JWT

**Prioridade:** P0
**Tipo:** Backend
**Milestone:** M1

### Subtasks

* Criar endpoint `POST /auth/login`.
* Validar credenciais.
* Gerar access token.
* Gerar refresh token.
* Armazenar refresh token com hash.
* Retornar usuário, roles e permissions.

### Critérios de aceite

* Login válido deve retornar tokens.
* Login inválido deve retornar erro amigável.
* Access token deve expirar em 15 minutos.
* Refresh token deve ser armazenado com hash.
* Logs não devem exibir senha ou token.

---

## LF-013 — Implementar refresh token e logout

**Prioridade:** P0
**Tipo:** Backend
**Milestone:** M1

### Subtasks

* Criar endpoint `POST /auth/refresh`.
* Criar endpoint `POST /auth/logout`.
* Validar refresh token.
* Gerar novo access token.
* Invalidar refresh token no logout.

### Critérios de aceite

* Refresh token válido deve gerar novo access token.
* Refresh token inválido deve ser rejeitado.
* Logout deve invalidar refresh token.
* Token reutilizado após logout deve falhar.

---

## LF-014 — Criar AuthGuard e PermissionGuard

**Prioridade:** P0
**Tipo:** Backend / Security
**Milestone:** M1

### Subtasks

* Criar `JwtAuthGuard`.
* Criar decorator `@CurrentUser`.
* Criar decorator `@RequirePermissions`.
* Criar `PermissionGuard`.
* Criar testes básicos de permissão.

### Critérios de aceite

* Rota protegida deve bloquear usuário sem token.
* Rota com permissão deve bloquear usuário não autorizado.
* Erro de permissão deve retornar `FORBIDDEN`.
* Backend deve validar permissões mesmo que frontend tente chamar direto.

---

## LF-015 — Implementar isolamento multitenant nas queries

**Prioridade:** P0
**Tipo:** Backend / Security
**Milestone:** M1

### Subtasks

* Criar padrão de repository com `tenantId`.
* Criar helper para escopo de tenant.
* Garantir filtro por tenant nas queries principais.
* Criar teste de acesso cross-tenant.

### Critérios de aceite

* Usuário não deve acessar dados de outro tenant.
* Tentativa cross-tenant deve retornar `FORBIDDEN` ou `NOT_FOUND`.
* Teste deve provar isolamento.

---

## LF-016 — Criar telas de login e sessão no frontend

**Prioridade:** P0
**Tipo:** Frontend
**Milestone:** M1

### Subtasks

* Criar `LoginView`.
* Criar `auth.service.ts`.
* Criar `auth.store.ts`.
* Salvar access token.
* Criar interceptor Axios.
* Criar router guard.
* Criar layout autenticado.

### Critérios de aceite

* Usuário deve conseguir fazer login.
* Token deve ser enviado nas requests.
* Usuário não autenticado deve ser redirecionado.
* Logout deve limpar sessão.
* Erros devem aparecer em toast.

---

# EPIC LF-E02 — UX Foundation, Erros, Toasts, Modais e i18n

## Objetivo

Criar uma experiência consistente, traduzível e segura para mensagens, erros e ações críticas.

---

## LF-020 — Criar Global Exception Filter

**Prioridade:** P0
**Tipo:** Backend
**Milestone:** M2

### Subtasks

* Criar `ApiErrorResponse`.
* Criar `ErrorCode`.
* Criar `AppException`.
* Criar `GlobalExceptionFilter`.
* Adicionar `traceId`.
* Esconder stack trace do usuário.

### Critérios de aceite

* Todo erro deve seguir formato padrão.
* Todo erro deve conter `traceId`.
* Stack trace não deve ir para o frontend.
* Erros inesperados devem retornar mensagem genérica.

---

## LF-021 — Criar catálogo de erros

**Prioridade:** P0
**Tipo:** Backend / Frontend
**Milestone:** M2

### Subtasks

* Criar enum de códigos no backend.
* Criar mapeamento de mensagens no frontend.
* Criar traduções em `pt-BR`.
* Criar traduções em `en-US`.
* Criar traduções em `es-ES`.

### Critérios de aceite

* Frontend deve traduzir erro pelo `code`.
* Mensagem técnica não deve aparecer para usuário.
* Código desconhecido deve ter fallback amigável.

---

## LF-022 — Criar sistema global de toasts

**Prioridade:** P0
**Tipo:** Frontend
**Milestone:** M2

### Tipos

* Success.
* Error.
* Warning.
* Info.
* Loading.

### Critérios de aceite

* Toast deve aparecer em ações de sucesso.
* Toast deve aparecer em erros.
* Toast deve sumir automaticamente quando aplicável.
* Toast de loading deve permitir encerramento manual.
* Componente deve ser reutilizável.

---

## LF-023 — Criar sistema global de modais de confirmação

**Prioridade:** P0
**Tipo:** Frontend
**Milestone:** M2

### Subtasks

* Criar `ConfirmModal`.
* Criar composable `useConfirm`.
* Suportar título, descrição e tipo.
* Suportar botão destrutivo.
* Suportar loading na confirmação.

### Critérios de aceite

* Ação crítica deve exigir confirmação.
* Cancelar modal não deve executar ação.
* Modal deve ser reutilizável.
* Modal deve funcionar com textos traduzidos.

---

## LF-024 — Implementar i18n baseado em JSON

**Prioridade:** P0
**Tipo:** Frontend
**Milestone:** M2

### Subtasks

* Criar `src/locales/pt-BR.json`.
* Criar `src/locales/en-US.json`.
* Criar `src/locales/es-ES.json`.
* Criar `locale.store.ts`.
* Criar helper `t`.
* Criar seletor de idioma.

### Critérios de aceite

* Usuário deve trocar idioma.
* Traduções devem refletir na interface.
* Idioma deve persistir no localStorage.
* Mensagens de erro devem ser traduzidas.

---

## LF-025 — Criar componentes de estado

**Prioridade:** P1
**Tipo:** Frontend
**Milestone:** M2

### Componentes

* `LoadingState`
* `ErrorState`
* `EmptyState`
* `StatusBadge`

### Critérios de aceite

* Componentes devem ser reutilizáveis.
* Componentes devem respeitar idioma.
* Componentes devem ser usados em pelo menos uma tela real.

---

# EPIC LF-E03 — Clientes, Pagamentos e Stripe MVP

## Objetivo

Implementar o fluxo principal de negócio com clientes e pagamentos usando Stripe como primeiro gateway.

---

## LF-030 — Criar modelos de Customer e Payment

**Prioridade:** P0
**Tipo:** Backend / Database
**Milestone:** M3

### Entidades

* Customer.
* Payment.
* PaymentEvent.
* PaymentGatewayConfig.

### Critérios de aceite

* Migration deve executar.
* Entidades devem possuir `tenantId`.
* Payment deve possuir provider.
* Payment deve possuir status interno.
* Payment deve possuir externalId opcional.
* Campos monetários devem ser armazenados em centavos.

---

## LF-031 — Criar CRUD de clientes

**Prioridade:** P0
**Tipo:** Backend
**Milestone:** M3

### Endpoints

* `POST /customers`
* `GET /customers`
* `GET /customers/:id`
* `PATCH /customers/:id`

### Critérios de aceite

* Criar cliente.
* Listar clientes com paginação backend.
* Buscar cliente por ID respeitando tenant.
* Editar cliente.
* Validar permissões.
* Retornar erros amigáveis.

---

## LF-032 — Criar telas de clientes

**Prioridade:** P0
**Tipo:** Frontend
**Milestone:** M3

### Telas

* Listagem de clientes.
* Formulário de criação.
* Detalhe do cliente.

### Critérios de aceite

* Listagem deve usar paginação backend.
* Formulário deve validar campos.
* Erros devem aparecer por toast.
* Tela deve usar services, não Axios direto.
* Componentes devem ser reutilizáveis.

---

## LF-033 — Criar abstração de gateway de pagamento

**Prioridade:** P0
**Tipo:** Backend / Payments
**Milestone:** M3

### Subtasks

* Criar interface `IPaymentGateway`.
* Criar DTOs internos.
* Criar `PaymentGatewayFactory`.
* Criar adapter fake para testes.
* Criar adapter Stripe inicial.

### Critérios de aceite

* Core não deve importar SDK do Stripe.
* Service deve depender da interface.
* Factory deve retornar provider correto.
* Adapter Stripe deve implementar contrato.

---

## LF-034 — Implementar configuração Stripe por tenant

**Prioridade:** P0
**Tipo:** Backend / Security
**Milestone:** M3

### Subtasks

* Criar entidade de configuração.
* Criptografar secret key.
* Salvar provider ativo.
* Criar endpoint para configurar Stripe.
* Criar endpoint para testar conexão.

### Critérios de aceite

* Credencial deve ser criptografada.
* Credencial não deve aparecer em logs.
* Owner deve poder configurar provider.
* Usuário sem permissão não deve configurar provider.
* Teste de conexão deve retornar sucesso ou erro amigável.

---

## LF-035 — Criar cobrança via Stripe

**Prioridade:** P0
**Tipo:** Backend / Payments
**Milestone:** M3

### Subtasks

* Criar endpoint `POST /payments`.
* Validar customer.
* Validar amount.
* Validar método de pagamento.
* Criar registro local.
* Chamar adapter Stripe.
* Atualizar externalId.
* Salvar payload bruto no MongoDB.
* Registrar PaymentEvent.

### Critérios de aceite

* Deve criar cobrança via Stripe Sandbox.
* Deve persistir pagamento no PostgreSQL.
* Deve salvar payload bruto no MongoDB.
* Deve retornar status interno.
* Erros do Stripe devem ser amigáveis.
* Requisição duplicada com idempotency key não deve duplicar cobrança.

---

## LF-036 — Criar listagem e detalhe de pagamentos

**Prioridade:** P0
**Tipo:** Backend / Frontend
**Milestone:** M3

### Backend

* `GET /payments`
* `GET /payments/:id`

### Frontend

* Tela de listagem.
* Tela de detalhe.
* Status badge.
* Filtros básicos.

### Critérios de aceite

* Listagem deve ser paginada pelo backend.
* Detalhe deve respeitar tenant.
* Status deve ser visualmente claro.
* Erros devem ser amigáveis.

---

# EPIC LF-E04 — Webhooks Inbound, Inbox e Idempotência

## Objetivo

Receber eventos externos do Stripe de forma segura e idempotente.

---

## LF-040 — Configurar raw body para webhooks

**Prioridade:** P0
**Tipo:** Backend / Webhooks
**Milestone:** M4

### Critérios de aceite

* Endpoint Stripe deve receber raw body.
* Demais rotas devem continuar usando JSON normal.
* Validação de assinatura deve ter acesso ao buffer original.

---

## LF-041 — Validar assinatura do webhook Stripe

**Prioridade:** P0
**Tipo:** Backend / Security
**Milestone:** M4

### Critérios de aceite

* Webhook sem assinatura deve retornar erro.
* Assinatura inválida deve retornar erro.
* Assinatura válida deve permitir processamento.
* Tentativas inválidas devem ser logadas sem dados sensíveis.

---

## LF-042 — Criar Inbox Pattern

**Prioridade:** P0
**Tipo:** Backend / Database
**Milestone:** M4

### Subtasks

* Criar entidade `InboxEvent`.
* Salvar evento recebido.
* Detectar duplicidade por externalEventId.
* Controlar status.
* Registrar erro em falha.

### Critérios de aceite

* Evento válido deve ser salvo.
* Evento duplicado não deve processar duas vezes.
* Evento com falha deve ficar rastreável.
* Reprocessamento futuro deve ser possível.

---

## LF-043 — Processar eventos Stripe principais

**Prioridade:** P0
**Tipo:** Backend / Payments
**Milestone:** M4

### Eventos

* `payment_intent.succeeded`
* `payment_intent.payment_failed`
* `charge.refunded`

### Critérios de aceite

* Evento de pagamento aprovado deve atualizar status para `PAID`.
* Evento de falha deve atualizar status para `FAILED`.
* Evento de reembolso deve atualizar status para `REFUNDED`.
* Mudanças devem gerar PaymentEvent.
* Mudanças devem gerar auditoria.

---

# EPIC LF-E05 — RabbitMQ, Outbox e Workers

## Objetivo

Adicionar processamento assíncrono robusto e confiável.

---

## LF-050 — Configurar módulo RabbitMQ

**Prioridade:** P1
**Tipo:** Backend / Infra
**Milestone:** M5

### Subtasks

* Criar conexão RabbitMQ.
* Criar publisher.
* Criar consumer base.
* Criar exchange principal.
* Criar DLX.
* Criar filas principais.

### Critérios de aceite

* API deve publicar mensagem teste.
* Worker deve consumir mensagem teste.
* DLX deve estar configurada.
* README deve documentar filas.

---

## LF-051 — Criar Outbox Pattern

**Prioridade:** P1
**Tipo:** Backend / Database
**Milestone:** M5

### Subtasks

* Criar entidade `OutboxEvent`.
* Criar repository.
* Criar worker de publicação.
* Marcar evento como publicado.
* Controlar tentativas.

### Critérios de aceite

* Evento deve ser criado junto com operação principal.
* Worker deve publicar eventos pendentes.
* Evento publicado deve ser marcado.
* Falha deve ser retentada.
* Não deve haver publicação duplicada.

---

## LF-052 — Criar consumers resilientes

**Prioridade:** P1
**Tipo:** Backend / Workers
**Milestone:** M5

### Consumers

* Email consumer.
* Webhook dispatch consumer.
* Report export consumer.
* Notification consumer.

### Critérios de aceite

* Consumer não deve derrubar app em erro isolado.
* Erro deve ser logado com `traceId`.
* Mensagens devem ter retry.
* Falha definitiva deve ir para DLQ.

---

# EPIC LF-E06 — E-mails e Notificações

## Objetivo

Enviar e-mails transacionais e notificações internas de forma assíncrona.

---

## LF-060 — Criar módulo de e-mails

**Prioridade:** P1
**Tipo:** Backend / Emails
**Milestone:** M6

### Subtasks

* Criar `IEmailProvider`.
* Criar provider SMTP.
* Integrar Mailpit.
* Criar templates por idioma.
* Criar use case de envio.
* Criar fila de envio.

### Critérios de aceite

* E-mail deve ser enviado via fila.
* Mailpit deve receber mensagem.
* Template deve respeitar idioma.
* Falha deve gerar retry.
* Conteúdo não deve expor dados sensíveis.

---

## LF-061 — Criar eventos de e-mail

**Prioridade:** P1
**Tipo:** Backend
**Milestone:** M6

### Eventos

* Cadastro criado.
* Recuperação de senha.
* Pagamento aprovado.
* Pagamento recusado.
* Relatório pronto.
* Webhook falhou definitivamente.
* API key criada.
* Gateway alterado.

### Critérios de aceite

* Cada evento deve gerar solicitação de e-mail quando aplicável.
* Envio deve ser assíncrono.
* Eventos devem ser auditáveis.

---

## LF-062 — Criar notificações in-app

**Prioridade:** P1
**Tipo:** Backend / Frontend
**Milestone:** M6

### Backend

* Criar entidade Notification.
* Criar endpoint de listagem.
* Criar endpoint marcar como lida.
* Criar WebSocket Gateway.

### Frontend

* Criar sino de notificações.
* Criar dropdown.
* Criar tela de histórico.
* Criar badge de não lidas.

### Critérios de aceite

* Usuário deve ver notificações.
* Usuário deve marcar como lida.
* Notificação crítica deve aparecer em tempo real.
* Notificações devem respeitar tenant e usuário.

---

# EPIC LF-E07 — Relatórios e Exportações

## Objetivo

Criar exportações CSV/XLSX escaláveis usando streams.

---

## LF-070 — Criar modelo ExportJob

**Prioridade:** P1
**Tipo:** Backend / Database
**Milestone:** M7

### Campos

* id.
* tenantId.
* userId.
* type.
* format.
* status.
* filters.
* filePath.
* errorMessage.
* expiresAt.
* createdAt.
* updatedAt.

### Critérios de aceite

* Migration deve executar.
* Job deve ser isolado por tenant.
* Status deve ser rastreável.

---

## LF-071 — Criar exportação CSV com streams

**Prioridade:** P1
**Tipo:** Backend / Reports
**Milestone:** M7

### Critérios de aceite

* CSV deve ser gerado sem carregar tudo em memória.
* CSV deve respeitar filtros.
* CSV deve respeitar tenant.
* Arquivo deve conter cabeçalho.
* Exportação deve ser testada com volume alto simulado.

---

## LF-072 — Criar exportação XLSX com ExcelJS streaming

**Prioridade:** P1
**Tipo:** Backend / Reports
**Milestone:** M7

### Critérios de aceite

* XLSX deve ser gerado com `WorkbookWriter`.
* Linhas devem ser commitadas em streaming.
* Processo não deve estourar memória.
* Arquivo deve abrir corretamente no Excel/LibreOffice.
* Exportação deve ser assíncrona para volume alto.

---

## LF-073 — Criar tela de relatórios

**Prioridade:** P1
**Tipo:** Frontend
**Milestone:** M7

### Subtasks

* Criar filtros.
* Criar seleção de formato.
* Criar solicitação de exportação.
* Criar listagem de jobs.
* Criar status visual.
* Criar download.
* Criar modal para exportação pesada.

### Critérios de aceite

* Usuário deve solicitar relatório.
* Usuário deve ver status.
* Usuário deve baixar arquivo pronto.
* Toast deve avisar quando estiver pronto.
* Exportação deve respeitar permissões.

---

# EPIC LF-E08 — Dashboard e Frontend Enterprise

## Objetivo

Criar dashboard e telas principais com componentização forte.

---

## LF-080 — Criar Design System inicial

**Prioridade:** P1
**Tipo:** Frontend
**Milestone:** M8

### Componentes

* Button.
* Input.
* Select.
* Card.
* Badge.
* Modal.
* Table.
* Pagination.
* Dropdown.
* DateRangePicker.

### Critérios de aceite

* Componentes devem ser reutilizáveis.
* Componentes devem usar Tailwind e tokens globais.
* Componentes devem funcionar com TypeScript.
* Componentes devem respeitar estados disabled/loading/error.

---

## LF-081 — Criar dashboard financeiro

**Prioridade:** P1
**Tipo:** Frontend / Backend
**Milestone:** M8

### KPIs

* TPV.
* Pagamentos aprovados.
* Pagamentos recusados.
* Taxa de aprovação.
* Volume por método.
* Volume por provider.
* Webhooks com falha.

### Critérios de aceite

* Backend deve fornecer KPIs por tenant.
* Frontend deve exibir KPIs.
* Gráficos devem carregar sob demanda.
* Dashboard deve usar componentes reutilizáveis.
* Dados devem considerar filtros de data.

---

## LF-082 — Criar área de desenvolvedor

**Prioridade:** P2
**Tipo:** Frontend / Backend
**Milestone:** M8

### Funcionalidades

* Gerar API Key.
* Revogar API Key.
* Listar webhooks.
* Ver histórico de entregas.
* Ver documentação.
* Testar evento.

### Critérios de aceite

* API Key deve aparecer apenas uma vez.
* API Key deve ser armazenada com hash.
* Revogação deve exigir modal.
* Área deve exigir permissão Developer ou Owner.

---

# EPIC LF-E09 — Observabilidade

## Objetivo

Implementar logs, métricas, traces e dashboards.

---

## LF-090 — Configurar logs estruturados com Pino

**Prioridade:** P1
**Tipo:** Backend / Observability
**Milestone:** M9

### Critérios de aceite

* Logs devem ser JSON.
* Logs devem conter `traceId`.
* Logs devem conter tenant quando disponível.
* Logs não devem conter dados sensíveis.
* Erros devem ser logados com detalhes internos.

---

## LF-091 — Implementar traceId por request

**Prioridade:** P1
**Tipo:** Backend / Observability
**Milestone:** M9

### Critérios de aceite

* Toda request deve possuir `traceId`.
* `traceId` deve retornar em erros.
* `traceId` deve aparecer em logs.
* Workers devem preservar `traceId` em mensagens.

---

## LF-092 — Configurar OpenTelemetry

**Prioridade:** P2
**Tipo:** Backend / Observability
**Milestone:** M9

### Critérios de aceite

* HTTP deve ser instrumentado.
* Prisma deve ser instrumentado quando possível.
* RabbitMQ deve preservar contexto.
* Chamadas externas devem gerar spans.
* README deve explicar como visualizar traces.

---

## LF-093 — Configurar Prometheus e Grafana

**Prioridade:** P1
**Tipo:** Infra / Observability
**Milestone:** M9

### Dashboards

* API.
* RabbitMQ.
* PostgreSQL.
* Redis.
* Payments.
* Webhooks.
* Reports.

### Critérios de aceite

* Prometheus deve coletar métricas.
* Grafana deve exibir dashboards.
* README deve incluir prints ou instruções.
* Métricas de negócio devem aparecer.

---

# EPIC LF-E10 — Webhooks Outbound

## Objetivo

Permitir que clientes recebam eventos do LedgerFlow com segurança e retry.

---

## LF-100 — Criar cadastro de webhook endpoints

**Prioridade:** P2
**Tipo:** Backend / Frontend
**Milestone:** M10

### Critérios de aceite

* Tenant deve cadastrar endpoint.
* Endpoint deve ter secret.
* Secret deve ser criptografado.
* URL deve ser validada.
* Usuário sem permissão não deve configurar.

---

## LF-101 — Criar envio assinado de webhooks

**Prioridade:** P2
**Tipo:** Backend / Workers
**Milestone:** M10

### Critérios de aceite

* Payload deve ser assinado com HMAC.
* Header deve conter assinatura.
* Header deve conter timestamp.
* Falha deve gerar retry.
* Falha definitiva deve ir para DLQ.
* Tentativas devem ser auditadas.

---

## LF-102 — Criar tela de logs de webhooks

**Prioridade:** P2
**Tipo:** Frontend
**Milestone:** M10

### Critérios de aceite

* Usuário deve ver histórico.
* Usuário deve ver status code.
* Usuário deve ver payload mascarado quando necessário.
* Usuário deve reprocessar com permissão.
* Reprocessamento deve exigir modal.

---

# EPIC LF-E11 — Multi-Gateway

## Objetivo

Expandir o sistema para mais de um gateway real.

---

## LF-110 — Criar adapter Asaas

**Prioridade:** P3
**Tipo:** Backend / Payments
**Milestone:** M11

### Critérios de aceite

* Adapter deve implementar `IPaymentGateway`.
* Status devem ser normalizados.
* Payload bruto deve ser auditado.
* Erros devem ser convertidos para catálogo interno.
* Core não deve depender do SDK/API diretamente.

---

## LF-111 — Criar adapter Mercado Pago

**Prioridade:** P3
**Tipo:** Backend / Payments
**Milestone:** M11

### Critérios de aceite

* Adapter deve implementar `IPaymentGateway`.
* Status devem ser normalizados.
* Payload bruto deve ser auditado.
* Erros devem ser convertidos para catálogo interno.
* Core não deve depender do SDK/API diretamente.

---

## LF-112 — Criar tela de configuração de gateways

**Prioridade:** P2
**Tipo:** Frontend / Backend
**Milestone:** M11

### Critérios de aceite

* Owner deve escolher provider ativo.
* Troca deve exigir modal.
* Credenciais devem ser mascaradas.
* Teste de conexão deve existir.
* Histórico de alterações deve ser auditado.

---

# EPIC LF-E12 — Testes, Segurança e Qualidade

## Objetivo

Garantir confiabilidade, segurança e qualidade do projeto.

---

## LF-120 — Configurar testes backend

**Prioridade:** P1
**Tipo:** Backend / Tests
**Milestone:** M12

### Tipos

* Unitários.
* Integração.
* E2E.

### Critérios de aceite

* Testes devem rodar via script.
* Use cases principais devem ter testes.
* Guards devem ter testes.
* Repositories críticos devem ter testes.

---

## LF-121 — Testar RBAC e multitenancy

**Prioridade:** P0
**Tipo:** Backend / Security / Tests
**Milestone:** M12

### Critérios de aceite

* Usuário sem permissão deve ser bloqueado.
* Usuário de tenant A não deve acessar tenant B.
* Testes devem provar isolamento.
* Testes devem passar no CI.

---

## LF-122 — Testar idempotência e webhooks

**Prioridade:** P1
**Tipo:** Backend / Tests
**Milestone:** M12

### Critérios de aceite

* Webhook duplicado não deve processar duas vezes.
* Idempotency key duplicada não deve criar pagamento duplicado.
* Assinatura inválida deve ser rejeitada.
* Evento válido deve atualizar status.

---

## LF-123 — Configurar testes frontend

**Prioridade:** P2
**Tipo:** Frontend / Tests
**Milestone:** M12

### Critérios de aceite

* Componentes principais devem ter testes.
* Stores principais devem ter testes.
* Services devem ser testáveis.
* Guards de rota devem ser testados.

---

## LF-124 — Configurar auditoria de dependências

**Prioridade:** P0
**Tipo:** Security / CI
**Milestone:** M12

### Subtasks

* Configurar `npm audit`.
* Configurar Dependabot ou Renovate.
* Configurar CodeQL.
* Configurar secret scanning.
* Documentar regra de dependências.

### Critérios de aceite

* Vulnerabilidades high ou critical devem bloquear merge.
* Dependências sem manutenção há mais de 12 meses devem ser evitadas.
* Dependências relevantes devem ser justificadas.

---

## LF-125 — Criar testes de carga com k6

**Prioridade:** P2
**Tipo:** Tests / Performance
**Milestone:** M12

### Cenários

* Login.
* Criar pagamento.
* Listar pagamentos.
* Receber webhook.
* Exportar relatório.

### Critérios de aceite

* Scripts k6 devem existir.
* README deve explicar execução.
* Resultados devem ser documentados.
* Prints ou resumo devem entrar no portfólio.

---

# EPIC LF-E13 — Documentação e Portfólio

## Objetivo

Transformar o projeto em uma apresentação técnica forte.

---

## LF-130 — Criar README profissional

**Prioridade:** P0
**Tipo:** Docs
**Milestone:** M12

### Seções

* Visão geral.
* Problema de negócio.
* Stack.
* Arquitetura.
* Como rodar.
* Serviços locais.
* Variáveis de ambiente.
* Fluxo de pagamentos.
* Fluxo de webhooks.
* Observabilidade.
* Segurança.
* Testes.
* Roadmap.

### Critérios de aceite

* Alguém externo deve conseguir rodar o projeto.
* README deve explicar valor técnico em poucos minutos.
* README deve conter diagramas ou links para diagramas.
* README deve conter prints quando disponíveis.

---

## LF-131 — Criar Swagger e Redoc

**Prioridade:** P1
**Tipo:** Docs / Backend
**Milestone:** M12

### Critérios de aceite

* Swagger deve estar em `/api/docs`.
* Redoc deve estar em `/api/reference`.
* Rotas protegidas devem documentar Bearer Auth.
* DTOs devem aparecer corretamente.
* Exemplos de resposta devem estar documentados.

---

## LF-132 — Criar AsyncAPI

**Prioridade:** P2
**Tipo:** Docs / Messaging
**Milestone:** M12

### Critérios de aceite

* Eventos devem estar documentados.
* Filas devem estar documentadas.
* Routing keys devem estar documentadas.
* Payloads devem ter exemplos.
* README deve linkar AsyncAPI.

---

## LF-133 — Criar ADRs iniciais

**Prioridade:** P1
**Tipo:** Docs / Architecture
**Milestone:** M12

### ADRs

* Modular Monolith.
* Payment Gateway Abstraction.
* Outbox e Inbox.
* Observability Stack.
* Multitenancy Model.
* PostgreSQL + MongoDB.
* RabbitMQ.
* Error Handling Strategy.

### Critérios de aceite

* ADRs devem explicar contexto, decisão e consequências.
* ADRs devem estar versionados.
* README deve apontar para os ADRs.

---

# 8. Ordem Recomendada de Execução

## Sprint 1 — Fundação

1. LF-001 — Criar estrutura inicial.
2. LF-002 — Criar projeto NestJS.
3. LF-003 — Criar projeto Vue 3.
4. LF-004 — Configurar Docker Compose.
5. LF-005 — Configurar Prisma e PostgreSQL.
6. LF-006 — Adicionar documentação base.

## Sprint 2 — Auth e Tenant

1. LF-010 — Modelos de Auth e Tenancy.
2. LF-011 — Cadastro de tenant e owner.
3. LF-012 — Login com JWT.
4. LF-013 — Refresh token e logout.
5. LF-014 — AuthGuard e PermissionGuard.
6. LF-016 — Login no frontend.

## Sprint 3 — Segurança e UX Base

1. LF-020 — Global Exception Filter.
2. LF-021 — Catálogo de erros.
3. LF-022 — Toasts.
4. LF-023 — Modais.
5. LF-024 — i18n.
6. LF-025 — Estados reutilizáveis.

## Sprint 4 — Clientes e Pagamentos Base

1. LF-030 — Modelos Customer e Payment.
2. LF-031 — CRUD de clientes.
3. LF-032 — Telas de clientes.
4. LF-033 — Abstração de gateway.
5. LF-034 — Configuração Stripe.
6. LF-035 — Criar cobrança via Stripe.
7. LF-036 — Listagem e detalhe de pagamentos.

## Sprint 5 — Webhooks e Idempotência

1. LF-040 — Raw body.
2. LF-041 — Assinatura Stripe.
3. LF-042 — Inbox Pattern.
4. LF-043 — Eventos Stripe principais.
5. LF-122 — Testes de idempotência e webhooks.

## Sprint 6 — Mensageria

1. LF-050 — RabbitMQ.
2. LF-051 — Outbox.
3. LF-052 — Consumers resilientes.

## Sprint 7 — E-mails e Notificações

1. LF-060 — Módulo de e-mails.
2. LF-061 — Eventos de e-mail.
3. LF-062 — Notificações in-app.

## Sprint 8 — Relatórios

1. LF-070 — ExportJob.
2. LF-071 — CSV com streams.
3. LF-072 — XLSX com ExcelJS.
4. LF-073 — Tela de relatórios.

## Sprint 9 — Dashboard e Observabilidade

1. LF-080 — Design System.
2. LF-081 — Dashboard financeiro.
3. LF-090 — Logs estruturados.
4. LF-091 — TraceId.
5. LF-093 — Prometheus e Grafana.

## Sprint 10 — Polimento Enterprise

1. LF-100 — Webhook endpoints.
2. LF-101 — Envio assinado.
3. LF-102 — Logs de webhooks.
4. LF-120 — Testes backend.
5. LF-121 — Testes RBAC/multitenancy.
6. LF-124 — Auditoria de dependências.
7. LF-130 — README profissional.
8. LF-131 — Swagger e Redoc.
9. LF-133 — ADRs iniciais.

---

# 9. MVP Realista

O MVP deve conter obrigatoriamente:

* Docker Compose.
* Backend NestJS.
* Frontend Vue.
* PostgreSQL com Prisma.
* Auth JWT.
* Multitenancy.
* RBAC.
* Erros padronizados.
* Toasts.
* Modais.
* i18n inicial.
* CRUD de clientes.
* Criação de cobrança.
* Stripe Adapter.
* Webhook Stripe.
* Inbox Pattern.
* Logs estruturados básicos.
* README profissional.

---

# 10. Versão Enterprise Completa

A versão enterprise completa deve conter:

* Tudo do MVP.
* RabbitMQ.
* Outbox Pattern.
* Redis para rate limit, idempotência e lock.
* MongoDB para auditoria.
* E-mails com Mailpit.
* Notificações in-app.
* Exportações CSV/XLSX com streams.
* Dashboard financeiro.
* Webhooks outbound.
* Observabilidade com Prometheus e Grafana.
* Datadog opcional.
* Testes automatizados.
* Testes de carga com k6.
* Swagger.
* Redoc.
* AsyncAPI.
* ADRs.
* Runbooks.
* README com evidências visuais.

---

# 11. Definition of Done Geral

Uma issue só pode ser marcada como `DONE` quando:

* Código foi implementado.
* Build passa.
* Lint passa.
* Erros são tratados.
* Permissões são validadas.
* Dados respeitam tenant.
* Logs não expõem dados sensíveis.
* Testes mínimos foram criados quando aplicável.
* Documentação foi atualizada quando necessário.
* Funcionalidade foi validada localmente.
* Nenhuma vulnerabilidade high ou critical foi introduzida.
* Nenhuma dependência abandonada foi adicionada.

---

# Checklist de Progresso Atual

## Fase Foundation & Auth (Concluídos)
* [x] Health checks
* [x] Prisma setup
* [x] Seed inicial
* [x] Auth schema
* [x] Login backend
* [x] Refresh backend
* [x] Logout backend
* [x] Sessão única
* [x] JWT guard
* [x] PermissionGuard inicial
* [x] Frontend login
* [x] AuthStore
* [x] Router guards
* [x] Swagger
* [x] Redoc
* [x] OpenAPI JSON

## UX Foundation
* [ ] Toast global
* [ ] Modal de confirmação
* [ ] Error boundary ou tratamento global de erros
* [ ] Loading states padronizados
* [ ] Empty states
* [ ] NotFound e Forbidden refinados

## API Documentation DoD
* [ ] Todo controller deve ter @ApiTags
* [ ] Todo endpoint público deve ter @ApiOperation
* [ ] Todo DTO público deve ter @ApiProperty
* [ ] Toda rota protegida deve ter @ApiBearerAuth
* [ ] Todo novo módulo deve aparecer no OpenAPI
* [ ] README deve apontar para Swagger, Redoc e OpenAPI JSON

## Security backlog
* [ ] Rate limit para login
* [ ] Helmet
* [ ] CORS restrito por ambiente
* [ ] GlobalExceptionFilter
* [ ] RequestId/TraceId middleware
* [ ] Logs sanitizados
* [ ] AuditLog para ações sensíveis
* [ ] Cookies HttpOnly para refresh token em produção
