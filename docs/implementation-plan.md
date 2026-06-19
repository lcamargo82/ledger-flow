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

## Fase 0 — Foundation

**Status:** Concluída

**Itens:**
* Estrutura inicial
* Docker Compose
* API NestJS
* Frontend Vue
* Health checks
* Ambiente local validado

---

## Fase 1A — Database Foundation

**Status:** Concluída

**Itens:**
* Prisma
* PostgreSQL
* Tenant
* User
* Role
* Permission
* UserRole
* RolePermission
* Seed inicial
* Readiness com banco

---

## Fase 1B — Auth Schema Foundation

**Status:** Concluída

**Itens:**
* RefreshToken
* UserSession
* AuthAttempt
* Campos de segurança no User
* Prisma Studio

---

## Fase 2A — Backend Authentication Foundation

**Status:** Concluída

**Itens:**
* Login
* Refresh
* Logout
* JWT
* Refresh token com hash
* Sessão única
* Captura de IP/User-Agent
* AuthAttempt
* Bloqueio temporário

---

## Fase 2B — Auth Guards & RBAC Foundation

**Status:** Concluída

**Itens:**
* JwtAuthGuard
* JwtStrategy
* CurrentUser
* Public
* RequirePermissions
* PermissionGuard
* /auth/me
* Validação de usuário/tenant/sessão ativa

---

## Fase 2C — Frontend Authentication Foundation

**Status:** Concluída ou Em validação

**Itens:**
* LoginView
* AuthStore
* Axios interceptor
* Router guards
* AppLayout
* AuthLayout
* Dashboard placeholder
* Logout
* PermissionGate

---

## Fase 2D — API Documentation Foundation

**Status:** Concluída ou Em andamento

**Itens:**
* Swagger UI
* Redoc
* OpenAPI JSON
* DTOs documentados
* Bearer Auth
* App/Health/Auth documentados

---

## Fase 2E — UX Foundation

**Status:** Concluída

**Itens:**
* Toasts globais (AppToast, AppToastContainer, toast.store)
* Modais de confirmação (AppModal, AppConfirmDialog, confirm-dialog.store)
* Tratamento global de erros (http-error.ts)
* Estados de loading (AppLoading)
* Empty states & Error states (AppEmptyState, AppErrorState)
* Componentes base definitivos (AppButton, AppInput, AppPasswordInput, AppCard, AppAlert, AppBadge, LanguageSwitcher, AppPageHeader)
* i18n implementado
* Global CSS atualizado (Legibilidade, UI "Corporate Dark")
* Telas e Layouts padronizados
* Rota de forgot-password adicionada

---

## Fase 3A — Users Management Foundation

**Status:** Concluída

**Itens:**
* Backend: CRUD de usuários (Listagem paginada e detalhe)
* RBAC: Proteção de rotas e menus (`users:read`)
* Frontend: Tela de listagem de usuários e detalhes
* Frontend: AppTable componente base
* Documentação OpenAPI e Swagger

---

## Fase 3B — User Create/Update/Deactivate Foundation

**Status:** Concluída

**Itens:**
* Backend: Endpoints de criação (POST) e atualização (PATCH) de usuários.
* Backend: Troca de status de usuário (active/inactive) gerenciando revogação de tokens.
* Backend: Atribuição de roles a usuários protegida pelo tenant e OWNER.
* Frontend: Modais de criação e edição.
* Frontend: Formulário integrado com o users store.
* Frontend: Toast e I18N.
* Funcionalidade testada localmente.

---

## Fase 3C — Roles, Permissions & Tenant Settings Foundation

**Status:** Concluída

**Itens:**
* Roles backend
* Permissions backend
* Tenant settings backend
* Roles frontend
* Permissions frontend
* Tenant settings frontend
* OpenAPI
* i18n
* documentação
* Gestão de roles e permissões customizadas
* Tela de perfil
* Gestão do tenant

---

## Fase 3D — Conclusão de Users e Admin i18n

**Status:** Concluída

**Itens:**
* Correção de tradução flat/aninhada no frontend.
* Ajustes finais no botão "Novo Usuário".
* Script de validação de i18n adicionado.
* Atualização final do plano de desenvolvimento.

---

## Fase 4A — Customers Backend Foundation + Password Recovery Email

**Status:** Concluída

**Itens:**
* Backend: Módulo Customers com isolamento por Tenant e proteção RBAC.
* Backend: CRUD básico implementado com paginação, busca e filtros.
* Backend: Integração do Mailpit para envio de e-mails locais.
* Backend: Implementação do fluxo seguro de redefinição de senha (`forgot-password` e `reset-password`).
* Banco de Dados: Tabelas `Customer`, `PasswordResetToken` e `AuditLog`.
* Swagger/OpenAPI: Endpoints documentados.

## Fase 5 — Payments MVP

**Status:** Em andamento

### Fase 5B — Payments Frontend
Fase 5A — Payments Core Backend Foundation

**Status:** Concluída

**Itens:**
* Modelos do banco de dados (Payment, PaymentEvent).
* Seed de permissões (create, read, cancel, refund).
* Módulo NestJS isolado.
* Repository com interface abstrata e implementação Prisma.
* Serviço core com lógica de criação, validação de transição, cancelamento, reembolso e log de auditoria.
* Idempotência garantida via header `Idempotency-Key` e hashes criptografados (`idempotencyKeyHash`, `idempotencyRequestHash`).
* Proteção contra alteração arbitrária de status via payload (APIs específicas e restritas).
* Testes isolados com rotas.

---

## Fase 6 — Webhooks

---

## Fase 7 — Reports

---

## Fase 8 — Observability

### Brand Identity Application

Status: Concluído

Itens:

* aplicar logo no frontend
* aplicar favicon
* aplicar README banner
* criar docs/brand.md
* aplicar tokens visuais

### Login UI Refinement

Status: Concluído

Itens:
* O card de login foi refinado (proporção mais compacta, glassmorphism suavizado).
* Os estados de erro foram suavizados (cores menos agressivas, espaçamento melhorado).
* A tela de login mantém textos isolados no código, internacionalizados via i18n (pt-BR e en-US).
* A linha de hero foi ajustada para "Auditoria" na UI em vez de "Auditabilidade".
* O card está sem credenciais demo embutidas (segurança).

### Layout Interno & Dashboard UX

Status: Concluído

Itens:
* Extinção do Header Topo global, estabelecendo o uso de `AppPageHeader` por tela (Títulos e ações independentes em cada vista).
* Reestruturação da Sidebar (`AppLayout`), incorporando um rodapé funcional com idioma, dados do usuário e botão "Sair" consolidado.
* Reposicionamento do sistema de Toasts (`AppToastContainer`) para o canto inferior direito (bottom-right), preservando a visibilidade dos cards superiores.
* Reorganização do Dashboard: banner (`ledgerflow-app-header2.png`) centralizado logo abaixo do cabeçalho da página, sem aparência de "botão/seta" fantasma; Cards do dashboard realinhados com tags de permissões mais compactas e controle de altura consistentes.

---

## Fase UI-1 — LedgerFlow UI Blueprint & Screen Flow

**Status:** Concluída

**Itens:**
* Fluxo de navegação mapeado.
* Especificação de telas.
* Componentes mapeados.
* Plano de refatoração estruturado.

---

## Fase UI-2 — Refatoração das Telas Existentes

**Status:** Pendente

**Itens:**
* Refatorar telas conforme UI Blueprint (AppLayout, Sidebar, Login, Dashboard, Users, Roles, Permissions, Settings, etc).
* Implementar Component Library.

---

## Fase 4A.1 — Password Recovery Frontend

**Status:** Concluída após validação

**Itens:**
* Fluxo Forgot Password e Reset Password.
* Integração backend.
* Segurança de UI e mensagens genéricas.

---

## Fase 4B — Customers Frontend

**Status:** Pendente

**Itens:**
* Listagem de clientes com tabela e filtros.
* Cadastro, edição e detalhes.
* Integração de RBAC (customers:read, create, update).
