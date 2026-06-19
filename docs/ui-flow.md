# LedgerFlow UI Flow

Este documento contém o fluxo oficial de navegação do produto/frontend do LedgerFlow.

## 1. Public/Auth Flow

Telas acessíveis sem autenticação, focadas no acesso e recuperação de conta.

* **Login** (`/login`)
* **Forgot Password** (`/forgot-password`)
* **Reset Password** (`/reset-password?token=`)
* **Forbidden** (`/forbidden`) - Exibida quando o usuário autenticado tenta acessar recurso sem permissão.
* **Not Found** (`/not-found` ou catch-all) - Exibida para rotas inexistentes.

## 2. Authenticated App Flow

Telas acessíveis após autenticação bem-sucedida, com verificação de roles/permissions.

* **Dashboard** (`/dashboard`)
* **Users** (`/users`)
  * User list
  * User details
  * Create user
  * Edit user
  * Activate/deactivate user
* **Roles** (`/roles`)
  * Role list
  * Role details
* **Permissions** (`/permissions`)
  * Permission list
* **Organization / Tenant Settings** (`/settings/tenant`)
* **Customers** (`/customers`) - *Futura tela da Fase 4B*
* **Payments** (`/payments`) - *Futura tela da Fase 5*
* **Reconciliation** (`/reconciliation`) - *Futura tela*
* **Reports** (`/reports`) - *Futura tela*
* **Webhooks** (`/webhooks`) - *Futura tela*
* **Audit Logs** (`/audit-logs`) - *Futura tela*

## 3. Mapa de Navegação

Abaixo a lista plana de rotas e seus respectivos status de implementação:

| Rota | Status | Layout | Permissão Necessária | Objetivo / Observações |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | Implementada | `AuthLayout` | `public` | Autenticação no sistema |
| `/forgot-password` | Implementada | `AuthLayout` | `public` | Solicitar recuperação de senha |
| `/reset-password` | Implementada | `AuthLayout` | `public` | Criar nova senha |
| `/dashboard` | Parcial | `AppLayout` | Qualquer | Visão geral, métricas de negócio |
| `/users` | Implementada | `AppLayout` | `users:read` | Listagem de usuários |
| `/roles` | Parcial | `AppLayout` | `roles:manage` | Listagem e gestão de roles |
| `/permissions` | Parcial | `AppLayout` | `permissions:read` | Listagem de permissões do sistema |
| `/settings/tenant` | Parcial | `AppLayout` | `tenant:update` | Configuração da organização atual |
| `/customers` | Futura (Fase 4B) | `AppLayout` | `customers:read` | Gestão de clientes |
| `/payments` | Futura (Fase 5) | `AppLayout` | `payments:read` | Visão de pagamentos |
| `/reconciliation`| Futura | `AppLayout` | a definir | Conciliação financeira |
| `/reports` | Futura | `AppLayout` | a definir | Relatórios de sistema |
| `/webhooks` | Futura | `AppLayout` | a definir | Configuração e logs de webhooks |
| `/audit-logs` | Futura | `AppLayout` | a definir | Logs de auditoria geral |
| `/forbidden` | Implementada | `AppLayout` / `AuthLayout` | N/A | Informar acesso negado por falta de permissão |
| `/not-found` | Implementada | `AppLayout` / `AuthLayout` | N/A | Informar recurso ou rota não encontrada |
