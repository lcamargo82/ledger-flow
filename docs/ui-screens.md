# LedgerFlow UI Screens

Especificação detalhada, tela a tela, baseada no UI Blueprint e nos requisitos de segurança.

## 1. Login

- **Rota:** `/login`
- **Status:** Parcial (Requer refatoração com UI Blueprint)
- **Objetivo:** Autenticar o usuário no tenant e estabelecer sessão.
- **Público/role esperado:** Público (qualquer usuário não autenticado).
- **Permissões necessárias:** Nenhuma.
- **Layout:** `AuthLayout`
- **Componentes usados:** `AuthHero`, `AppBrand`, `LoginForm`, `AppInput`, `AppPasswordInput`, `AppButton`, `AppAlert`
- **Dados consumidos:** POST `/auth/login`
- **Estados:**
  - default
  - loading
  - invalid credentials
  - locked account
  - expired session message
- **Regras de segurança:** Nunca expor access/refresh token ou dados sensíveis em UI ou logs de erro.
- **i18n esperadas:** `auth.login.title`, `auth.login.email`, `auth.login.password`, `auth.login.submit`

### [Auth] Forgot Password

- **Route**: `/forgot-password`
- **Layout**: `AuthLayout`
- **Component**: `ForgotPasswordView`
- **Status**: Implemented (Fase 4A.1)
- **Description**: Solicitação de e-mail corporativo para envio de instruções de recuperação.
- **Key States**:
  - Formulário com campo de e-mail.
  - Mensagem de sucesso genérica que não revela a existência do e-mail na base de dados.
  - Alertas de validação.

### [Auth] Reset Password

- **Route**: `/reset-password`
- **Layout**: `AuthLayout`
- **Component**: `ResetPasswordView`
- **Status**: Implemented (Fase 4A.1)
- **Description**: Criação de nova senha baseada no token enviado por e-mail.
- **Key States**:
  - Leitura de token seguro da URL via `route.query.token`.
  - Formulário contendo nova senha e confirmar senha com regra de senhas consistentes.
  - Ocultamento da UI e link de solicitação em caso de token inválido/ausente.
  - Fluxo que obriga nova autenticação pelo formulário `/login` após o sucesso.

## 4. Dashboard

- **Rota:** `/dashboard`
- **Status:** Parcial/temporário
- **Objetivo:** Exibir visão geral (cards atuais de perfil/sessão são temporários). Dashboard final será substituído por conteúdo real de negócio (TPV, pagamentos aprovados/falhos, clientes ativos, webhooks com falha, exportações recentes, status dos gateways).
- **Layout:** `AppLayout`

## 5. Users

- **Rota:** `/users`
- **Status:** Implementada (Requer alinhamento de componentes)
- **Objetivo:** Gestão de usuários da organização atual.
- **Permissões:** `users:read`, `users:create` (para botão de novo usuário), `users:update` (para edição, status e alteração de roles).
- **Layout:** `AppLayout`
- **Estrutura:** Filtros (nome, email, status), Tabela com paginação, Modal de criação (`novo_usuario.html`), Modal de edição e detalhes, Confirmação de ativação/desativação.

## 6. Roles

- **Rota:** `/roles`
- **Status:** Parcial
- **Permissão:** `roles:manage`
- **Layout:** `AppLayout`
- **Estrutura:** Tabela de roles, detalhe da role com permissions associadas. (Sem edição nesta fase).

## 7. Permissions

- **Rota:** `/permissions`
- **Status:** Parcial
- **Permissão:** `permissions:read`
- **Layout:** `AppLayout`
- **Estrutura:** Busca local e tabela de permissions listando os códigos (ex: `users:read`). (Sem edição nesta fase).

## 8. Organization / Tenant Settings

- **Rota:** `/settings/tenant`
- **Status:** Parcial
- **Permissão:** `tenant:update`
- **Layout:** `AppLayout`
- **Importante:** Na UI, preferir os nomes "Organização" ou "Configurações da Organização", embora o código possa usar `TenantSettings`.
- **Objetivo:** Configurar informações do tenant atual da empresa cliente. (Não é painel global do dono do produto).
- **Edições permitidas:** Somente name e timezone. `slug` e `active` são readonly.

## 9. Forbidden

- **Rota:** `/forbidden`
- **Status:** Implementada
- **Objetivo:** Exibir mensagem de acesso negado com um CTA (botão) para retornar ao Dashboard. Acionado pelo `PermissionGate` e router guards.

## 10. Not Found

- **Rota:** `/not-found` (ou catch-all `/:pathMatch(.*)*`)
- **Status:** Implementada
- **Objetivo:** Mostrar página não encontrada de forma alinhada ao design system.

## 11. Customers

- **Rota:** `/customers`
- **Status:** Implementada
- **Estrutura Esperada:** Lista de clientes, filtros, busca, criação, edição, detalhes, ativar/desativar, paginação.
- **Permissões:** `customers:read`, `customers:create`, `customers:update`

## 12. Component Library

- **Rota:** `/components` (Apenas em dev/local)
- **Objetivo:** Exibir a biblioteca base documentando todos os componentes criados a partir das referências (`docs/html/components.html`).

### Payments

- **Rota:** `/payments`
- **Permissões:** `payments:read`, `payments:create`, `payments:cancel`
- **Componentes:** Tabela de listagem com paginação e filtros (Busca, Status, Método, Data), Modal de criação (`PaymentForm`), Modal de Detalhes com Resumo e Timeline, Confirmação de cancelamento (`AppConfirmDialog`).
- **Segurança:** O valor é enviado em centavos, tenantId inferido, idempotency key gerada em memória para submit.

### Inventory

- **Rotas:** `/inventory`, `/inventory/warehouses`, `/inventory/movements`
- **Status:** Implementada 10.0.3
- **Permissões:** `inventory:read`, `inventory:manage`, `inventory:adjust`
- **Capability:** `inventory.manage`
- **Componentes:** `AppPageHeader`, `AppCard`, `AppTable`, `AppModal`, `AppInput`, `AppSelect`, `AppBadge`, item de menu no `AppLayout`.
- **Objetivo:** Gerenciar warehouses, consultar saldos projetados por SKU/warehouse e acompanhar o ledger de ajustes manuais.
- **Fluxos:** visão de saldos por SKU e warehouse em `/inventory`, criação/ativação/desativação de warehouse em `/inventory/warehouses`, ajuste manual de entrada/saída com motivo e histórico em `/inventory/movements`.
- **Segurança:** O menu e a rota são ocultados/bloqueados no frontend apenas como UX; o backend valida `@RequirePermissions` e `@RequireCapabilities`.
- **Fora de escopo:** reservas, pedidos, movimentações automáticas por pedido, marketplace, malha fina e financeiro por pedido.
- **i18n:** Namespace `inventory.*` em pt-BR e en-US.

### Catalog Products

- **Rota:** `/catalog/products`
- **Status:** Implementada 10.0.2
- **Permissões:** `catalog:read`, `catalog:manage`
- **Capability:** `catalog.manage`
- **Componentes:** `AppPageHeader`, `AppCard`, `AppInput`, `AppSelect`, `AppTable`, `AppModal`, `ProductForm`.
- **Objetivo:** CRUD paginado de produto simples, produto pai e variante/filho com `ProductSku`, preço de custo, moeda e unidade de medida.
- **Segurança:** O frontend esconde ações sem permissão/capability, mas o backend valida `@RequirePermissions` e `@RequireCapabilities`.
- **Fora de escopo:** warehouses, saldos, movimentações, reservas, pedidos, marketplace, malha fina e financeiro por pedido.
- **i18n:** Namespace `catalog.*` em pt-BR e en-US.
