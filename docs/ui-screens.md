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

- **Rotas:** `/inventory`, `/inventory/warehouses`, `/inventory/movements`, `/inventory/reservations`
- **Status:** Implementada 10.0.4
- **Permissões:** `inventory:read`, `inventory:manage`, `inventory:adjust`
- **Capability:** `inventory.manage`
- **Componentes:** `AppPageHeader`, `AppCard`, `AppTable`, `AppModal`, `AppInput`, `AppSelect`, `AppBadge`, item de menu no `AppLayout`.
- **Objetivo:** Gerenciar warehouses, consultar saldos projetados por SKU/warehouse, acompanhar o ledger e operar reservas administrativas.
- **Fluxos:** visão de saldos por SKU e warehouse em `/inventory`, criação/ativação/desativação de warehouse em `/inventory/warehouses`, ajuste manual de entrada/saída com motivo e histórico em `/inventory/movements`, reservas em `/inventory/reservations` com ações de criar, liberar e consumir reserva ativa.
- **Segurança:** O menu e a rota são ocultados/bloqueados no frontend apenas como UX; o backend valida `@RequirePermissions` e `@RequireCapabilities`.
- **Fora de escopo:** consumo parcial de reserva, pedidos, marketplace, malha fina e financeiro por pedido.
- **i18n:** Namespace `inventory.*` em pt-BR e en-US.

### Orders

- **Rota:** `/orders`
- **Status:** Implementada 10.0.5
- **Permissões:** `orders:read`, `orders:manage`
- **Capability:** `orders.manage`
- **Componentes:** `AppPageHeader`, `AppCard`, `AppTable`, `AppModal`, `AppInput`, `AppSelect`, `AppBadge`, item de menu no `AppLayout`.
- **Objetivo:** Criar pedidos internos e executar o ciclo confirmar, cancelar e concluir usando reservas de estoque; em 10.1.11, exibir resumo logístico operacional quando disponível.
- **Fluxos:** criação de pedido em rascunho, confirmação com reserva por item, cancelamento com liberação de reserva e conclusão com consumo da reserva. O resumo logístico mostra provider, status de shipment, shipment id string e tracking mascarado, sem semântica de fulfillment/SLA 10.3.
- **Segurança:** O frontend oculta ações sem permissão; o backend valida `@RequirePermissions` e `@RequireCapabilities`.
- **Fora de escopo:** marketplace settlement/payout, backorder, etiqueta, picking/packing e fulfillment avançado.
- **i18n:** Namespace `orders.*` em pt-BR e en-US.

### Channels

- **Rota:** `/channels`
- **Status:** Implementada 10.0.6–10.1; configuração operacional/health UX planejada em 10.1.10.
- **Permissões:** `channels:read`, `channels:manage`
- **Capability:** `channels.connect`; importação exige `channels.import_listings`; mapping exige `channels.mapping.manage`; sync exige `channels.sync_inventory`.
- **Componentes:** `AppPageHeader`, `AppCard`, `AppTable`, `AppModal`, `AppInput`, `AppSelect`, `AppBadge`, item de menu no `AppLayout`.
- **Objetivo:** Conectar canais reais, visualizar inbox sanitizado, revisar vínculos de anúncios com SKU e acompanhar sync de estoque.
- **Planejado 10.1.10:** configurar depósito/sync policy, ações por estado, health sanitizado e feedback OAuth traduzido.
- **Segurança:** Webhook público autentica por segredo da integração; UI protegida por permissão/capability; segredos e payload bruto não são exibidos.
- **Fora de escopo atual:** settlement 9B e fulfillment 10.3.
- **i18n:** Namespace `channels.*` em pt-BR e en-US.

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

### Analytics

- **Rota:** `/analytics`
- **Status:** Implementada 10.0.9.
- **Permissões:** `financial-intelligence:read`
- **Capability:** `financial.analytics.read`
- **Componentes:** `AppPageHeader`, `AppCard`, `AppSelect`, `AppTable`, `AppBadge`, `AppErrorState`.
- **Objetivo:** Exibir indicadores operacionais de `OrderFinancialFact` e fatos financeiros por pedido concluído.
- **Fluxos:** dashboard com contagem, receita operacional, CMV e margem; filtro por canal; tabela de facts com data, pedido, canal e componentes de margem.
- **Segurança:** backend valida permissão/capability; frontend apenas esconde rota/menu sem acesso.
- **Fora de escopo:** conciliação 9A, settlement de gateway, recebíveis e margem financeira conciliada.
- **i18n:** Namespace `financialIntelligence.*` em pt-BR e en-US.

### Exports

- **Rota:** `/exports`
- **Status:** Implementada 10.0.10.
- **Permissões:** `reports:export`
- **Componentes:** `AppPageHeader`, `AppCard`, `AppSelect`, `AppTable`, `AppBadge`, `AppButton`, `AppErrorState`.
- **Objetivo:** Criar e acompanhar exportações CSV pesadas de catálogo e facts financeiros com job rastreável.
- **Fluxos:** criação de job CSV, filtro por status, processamento manual de pendentes, cancelamento de pendentes e download de concluídos.
- **Segurança:** backend valida `reports:export`; download exige tenant do JWT, job concluído e não expirado; UI apenas esconde menu sem permissão.
- **Fora de escopo:** XLSX real, storage externo, agendamento recorrente e worker definitivo.
- **i18n:** Namespace `exports.*` em pt-BR e en-US.

### Notifications (implementada 10.2.0A)

- **Rota:** `/notifications`
- **Layout:** `AppLayout`, sino no footer da sidebar.
- **Autorização:** recipient + revalidação backend de permission/capability.
- **Componentes:** definidos em `docs/specs/10.2-components-i18n.md`.
- **Estados:** loading, vazio, erro, forbidden, unread/read/dismissed.
- **Polling:** contador a cada 30 segundos por padrão, configurável por `VITE_NOTIFICATIONS_POLLING_INTERVAL_MS` com piso de 10 segundos.

### Payment Gateway Connections

- **Rota:** `/settings/gateway-connections`.
- **Status Mercado Pago:** MP-0 hardening implementado; OAuth feedback normaliza `mercado-pago`, `mercado_pago` e `MERCADO_PAGO`.
- **Componentes:** `GatewayConnectionForm`, `GatewayConnectionCard`, `GatewayConnectionEmptyState`, modais de status/credencial/desconexão e `AppButton`.
- **Objetivo:** Gerenciar conexões de gateway por tenant sem expor segredos. Mercado Pago usa OAuth; credenciais da loja não são digitadas nem exibidas no painel.
- **Capability matrix atual:** Mercado Pago anuncia PIX, boleto, sandbox, fundação de webhook inbound, sincronização de status por webhook/fetch, cancelamento e estorno total. Refresh automático backend-only está implementado em MP-1; cartão e checkout avançado entram em sprints futuras.
- **Readiness financeira MP-6:** `GatewayConnectionCard` mostra `financialReadiness` apenas para Mercado Pago, distinguindo `PAYMENT_ONLY`, `SETTLEMENT_READY`, `REAUTH_REQUIRED` e `UNHEALTHY`, com escopos ausentes e motivos traduzidos. Essa indicação não executa ingestion de settlement; apenas prepara o usuário para a próxima fase 9B.
- **i18n:** Namespace `gateways.*` em pt-BR e en-US; não usar texto hardcoded em estados OAuth.

### Marketplace Settlement 9B-1/9B-4

- **Rota:** `/marketplace-settlement`.
- **Status:** Implementadas a fundação de contas financeiras, saldo inicial, sync manual de eventos financeiros Mercado Pago, cash position e P&L operacional.
- **Objetivo:** criar contas operacionais Mercado Pago somente para conexões `SETTLEMENT_READY`, exibir saldo atual/abertura, ledger append-only, eventos/totais importados, buckets de caixa e P&L operacional.
- **Ações:** criar conta com saldo inicial, motivo e observação; registrar ajuste manual auditado sem editar lançamentos anteriores; sincronizar Mercado Pago por período.
- **Dashboard:** mostra liberado, pendente, bloqueado, estornado, payout, receita líquida, COGS, frete e margem com disclaimer operacional.
- **Guards:** `marketplace-settlement:read/manage` + `marketplace_settlement.read/manage`.
- **Fora de escopo:** sync agendada, export CSV específico da tela, automações finais de fine mesh e contabilidade oficial.
- **i18n:** Namespace `marketplaceSettlement.*` em pt-BR e en-US.

### Reconciliation fine mesh 9B-3 evidence

- **Rota:** `/reconciliation`.
- **Status:** Cases de conciliação agora podem carregar evidência de pedido Mercado Livre quando o matching vem de `OrderFinancialFact.externalOrderId`.
- **Objetivo:** mostrar referência de pagamento ou pedido no mesmo grid de conciliação, sem expor payload bruto do Mercado Livre/Mercado Pago.
- **i18n:** `reconciliation.table.order` em pt-BR e en-US.

### Inventory Transfers

- **Rota:** `/inventory/transfers`.
- **Status:** Implementada 10.2.2.
- **Autorização:** `inventory:transfer` + `inventory.transfer`, com rota condicionada por feature flag.
- **Base:** reutiliza `AppPageHeader`, `AppTable`, `AppModal`, `AppSelect`, `AppNumberInput`, `AppBadge` e ledger Inventory existente.
- **UX:** lista por estado, criação multi-item, ações iniciar/concluir/cancelar condicionadas ao estado e feedback de erro traduzido.

### Cycle Counts

- **Rota:** `/inventory/cycle-counts`.
- **Status:** Implementada 10.2.3.
- **Autorização:** `inventory:cycle-count` + `inventory.cycle_count`, com rota condicionada por feature flag.
- **Base:** reutiliza `AppPageHeader`, `AppTable`, `AppModal`, `AppInput`, `AppTextarea`, `AppNumberInput`, `AppBadge` e ledger Inventory existente.
- **UX:** lista por estado, criação multi-SKU, abertura com snapshot de saldo, contagem por item, resumo de divergência, aprovação/cancelamento condicionados ao estado e feedback traduzido para stale balance.
