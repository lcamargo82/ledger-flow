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

## Fase 4 — Customers Foundation

---

## Fase 5 — Payments MVP

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
