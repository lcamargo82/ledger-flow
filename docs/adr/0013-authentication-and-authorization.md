# ADR-0013 — Estratégia de Autenticação, Autorização, RBAC e ABAC

**Status:** Aceito (Fase 2A - Foundation Backend Implementada)
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

## Status da Implementação (Fase 2A & 2B)

A **Fase 2A — Backend Authentication Foundation** implementou as seguintes funcionalidades no backend NestJS:
- Autenticação de Login com `accessToken` e `refreshToken`.
- Renovação de tokens (Refresh) e Logout com revogação explícita.
- Regra de **Sessão única por usuário** (novo login revoga sessões e refresh tokens anteriores).
- Captura e registro de IP e User-Agent.
- Registro de tentativas de autenticação (`AuthAttempt`).
- Controle avançado de sessões em banco de dados (`UserSession`).
- Proteção por limite de tentativas (bloqueio temporário da conta via `failedLoginAttempts` e `lockedUntil`).
- Armazenamento 100% seguro de tokens (apenas hash do `refreshToken` é salvo).

A **Fase 2B — Auth Guards, Current User e RBAC Foundation** adicionou:
- JWT Guard (`JwtAuthGuard`) aplicado globalmente em todas as rotas da aplicação, suportando rotas públicas via `@Public()`.
- Criação e integração do `PermissionGuard` para validação de `permissions` no payload do usuário via decorador `@RequirePermissions()`.
- Extensão do JWT com `sessionId` e validação real da sessão de acesso, revogando o token se a sessão for inativada ou expirar.
- Endpoint protegido `GET /auth/me` que usa um decorador `@CurrentUser()` seguro para acessar dados do usuário logado.

A **Fase 2D — API Documentation Foundation** garantiu que:
- Endpoints de autenticação estão documentados interativamente com OpenAPI/Swagger.
- Rotas protegidas agora estão sinalizadas com `Bearer Auth` (`@ApiBearerAuth`) na documentação Swagger UI e Redoc.

*Nota: Telas de frontend e validações contextuais de ABAC serão implementadas em fases subsequentes.*

---

## 1. Contexto

O LedgerFlow é uma plataforma B2B multitenant para gestão de pagamentos, clientes, webhooks, relatórios, usuários, permissões e integrações externas.

Como o sistema lida com operações financeiras e dados sensíveis, o controle de acesso precisa ser tratado como uma prioridade arquitetural.

O sistema terá diferentes perfis de usuários:

* Owner.
* Finance Operator.
* Support Viewer.
* Developer.

Cada perfil possui níveis diferentes de acesso. Algumas ações são altamente sensíveis, como:

* Reembolsar pagamento.
* Revogar API Key.
* Alterar gateway de pagamento.
* Criar usuário.
* Exportar relatório financeiro.
* Reprocessar webhook.
* Configurar credenciais externas.

Além disso, por ser multitenant, um usuário de um tenant nunca deve acessar dados de outro tenant.

---

## 2. Decisão

O LedgerFlow utilizará:

* **JWT Access Token** para autenticação de curta duração.
* **Refresh Token** seguro para renovação de sessão.
* **Hash de senha** para armazenamento seguro.
* **Hash de refresh token** no banco.
* **RBAC** como modelo principal de autorização.
* **ABAC** como extensão futura para regras contextuais.
* **Guards no NestJS** para proteção de rotas.
* **Decorators de permissão** para clareza nos controllers.
* **Permissões no frontend apenas para UX**, nunca como segurança final.
* **Validação obrigatória no backend** em toda ação protegida.

---

## 3. Modelo de Autenticação

## 3.1 Login

Fluxo:

```text
Usuário informa e-mail e senha
  ↓
Backend valida credenciais
  ↓
Backend gera access token
  ↓
Backend gera refresh token
  ↓
Refresh token é armazenado com hash
  ↓
Frontend recebe tokens
  ↓
Frontend usa access token nas requests
```

---

## 3.2 Access Token

Características:

* JWT.
* Curta duração.
* Sugestão inicial: 15 minutos.
* Carrega informações mínimas.
* Não deve carregar dados sensíveis.

Payload sugerido:

```json
{
  "sub": "user-id",
  "tenantId": "tenant-id",
  "email": "user@example.com",
  "roles": ["OWNER"],
  "permissions": ["payments:create", "payments:read"],
  "iat": 1718217000,
  "exp": 1718217900
}
```

---

## 3.3 Refresh Token

Características:

* Duração maior.
* Sugestão inicial: 7 dias.
* Deve ser armazenado com hash.
* Deve poder ser invalidado no logout.
* Deve ser rotacionado quando renovado.
* Deve ser invalidado se reutilizado indevidamente.

Regras:

* Nunca armazenar refresh token em texto puro.
* Nunca logar refresh token.
* Nunca retornar refresh token em logs de erro.
* Logout deve invalidar refresh token ativo.

---

## 3.4 Controle de Sessões e Segurança de Login (Planejamento Futuro)

Para aumentar a segurança e a rastreabilidade, o fluxo de autenticação futuro deverá:
* Capturar **IP e User-Agent** (e inferir dados do dispositivo) no momento do login para fins de auditoria e segurança.
* Manter um registro das **sessões ativas** do usuário, vinculadas ao refresh token (`UserSession`).
* Impor **Sessão Única por Usuário**: um novo login bem-sucedido deve revogar automaticamente sessões anteriores ativas.
* Registrar e auditar todas as tentativas de autenticação (`AuthAttempt`), rastreando sucessos, falhas e o motivo das falhas.
* Aplicar **bloqueio temporário** de conta após múltiplas falhas consecutivas de login (`failedLoginAttempts` e `lockedUntil`).

---

## 4. Hash de Senhas

Senhas devem ser armazenadas com algoritmo seguro e salt adequado.

Regras:

* Nunca armazenar senha em texto puro.
* Nunca logar senha.
* Validar força mínima da senha.
* Impedir senhas muito fracas.
* Permitir fluxo de recuperação de senha.
* Token de recuperação deve expirar.

---

## 5. RBAC — Role-Based Access Control

O RBAC será o modelo principal.

Entidades:

```text
User
Role
Permission
UserRole
RolePermission
```

Roles iniciais:

```text
OWNER
FINANCE_OPERATOR
SUPPORT_VIEWER
DEVELOPER
```

Permissões iniciais:

```text
payments:create
payments:read
payments:refund
customers:create
customers:read
reports:export
webhooks:manage
api-keys:manage
users:manage
gateways:manage
notifications:read
audit:read
```

---

## 6. ABAC — Attribute-Based Access Control

O ABAC não será o modelo principal no MVP, mas o sistema será preparado para suportá-lo.

Exemplos de regras futuras:

* Usuário só pode reembolsar pagamentos abaixo de determinado valor.
* Usuário só pode exportar relatórios de determinado período.
* Usuário só pode visualizar dados de uma unidade específica.
* Usuário só pode alterar gateway em horário comercial.
* Usuário só pode acessar dados se pertencer ao mesmo tenant.

Exemplo conceitual:

```text
Permissão: payments:refund
Condição: amount <= user.refundLimit
Condição: tenantId == user.tenantId
```

---

## 7. Guards e Decorators

Exemplo de uso esperado:

```typescript
@RequirePermissions('payments:refund')
@Post(':id/refund')
refundPayment() {
  // ...
}
```

Componentes necessários:

```text
JwtAuthGuard
PermissionGuard
CurrentUser decorator
RequirePermissions decorator
Public decorator
```

---

## 8. Controle no Frontend

O frontend deve usar permissões para:

* Esconder menus.
* Esconder botões.
* Bloquear rotas visualmente.
* Exibir mensagens amigáveis.
* Melhorar experiência do usuário.

Mas o backend continua sendo a fonte real de autorização.

Exemplo:

```vue
<PermissionGuard permission="payments:refund">
  <button>Reembolsar</button>
</PermissionGuard>
```

---

## 9. API Keys

Além de autenticação de usuários, o sistema terá API Keys para integrações externas.

Regras:

* API Keys devem estar vinculadas a um tenant.
* API Keys devem ser exibidas apenas uma vez.
* Apenas hash deve ser armazenado.
* API Keys devem possuir escopos.
* API Keys devem poder ser revogadas.
* Último uso deve ser registrado.
* Criação e revogação devem gerar auditoria.

Escopos sugeridos:

```text
payments:write
payments:read
customers:write
customers:read
webhooks:read
reports:read
```

---

## 10. Alternativas Consideradas

## 10.1 Sessão tradicional server-side

### Vantagens

* Fácil invalidar sessão.
* Menos exposição de token no cliente.
* Boa para aplicações web tradicionais.

### Desvantagens

* Menos flexível para APIs.
* Mais acoplada ao backend.
* Pode exigir storage de sessão.
* Menos adequada para integrações externas.

---

## 10.2 JWT sem refresh token

### Vantagens

* Simples.
* Menos endpoints.
* Menos persistência.

### Desvantagens

* Token longo aumenta risco.
* Token curto prejudica UX.
* Difícil invalidar sessão.
* Menor segurança operacional.

---

## 10.3 JWT com refresh token + RBAC

### Vantagens

* Boa experiência do usuário.
* Segurança melhor.
* Compatível com APIs.
* Permite expiração curta de access token.
* Permite controle de permissões.
* Modelo claro para portfólio enterprise.

### Desvantagens

* Mais complexidade.
* Exige armazenamento de refresh token.
* Exige rotação e invalidação.
* Exige cuidado com localStorage/cookies.

---

## 11. Segurança

Regras obrigatórias:

* Senhas com hash seguro.
* Refresh tokens com hash.
* Access token com expiração curta.
* Rate limit no login.
* Logs sem senha ou tokens.
* Guards obrigatórios em rotas protegidas.
* Validação de tenant em todas as operações.
* API Keys com hash.
* Secrets nunca exibidos em texto puro.
* Modais para ações críticas.
* Auditoria em ações sensíveis.

---

## 12. Observabilidade e Auditoria

Eventos de segurança devem registrar:

* Login bem-sucedido.
* Login falho.
* Logout.
* Refresh token usado.
* Refresh token inválido.
* Usuário criado.
* Permissão alterada.
* API Key criada.
* API Key revogada.
* Tentativa de acesso sem permissão.
* Tentativa de acesso cross-tenant.

Campos mínimos:

```json
{
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "userId": "user-id",
  "event": "AUTH_LOGIN_SUCCESS",
  "ip": "127.0.0.1",
  "userAgent": "browser",
  "createdAt": "2026-06-12T18:30:00.000Z"
}
```

---

## 13. Critérios de Validação

Esta decisão será considerada correta se:

* Login retornar access token e refresh token.
* Access token expirar em tempo curto.
* Refresh token for armazenado com hash.
* Logout invalidar sessão.
* Guards bloquearem rotas protegidas.
* Usuário sem permissão receber erro amigável.
* Usuário de um tenant não acessar outro tenant.
* API Keys forem armazenadas com hash.
* Ações sensíveis gerarem auditoria.
* Testes provarem RBAC e isolamento multitenant.

---

## 14. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto exigir SSO.
* O projeto exigir autenticação via OAuth2/OIDC.
* O produto virar comercial.
* Clientes enterprise exigirem SAML.
* For necessário MFA.
* O frontend migrar para autenticação baseada em cookies httpOnly.

Possíveis evoluções futuras:

* MFA.
* SSO com OIDC.
* SAML.
* Login social.
* Sessões por dispositivo.
* Revogação global de sessões.
* Risk-based authentication.

---

## Implementation Notes

### Phase 2C
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

### Phase 3B
Phase 3B — User Create/Update/Deactivate Foundation has been implemented.
This included:
- Requisito de permissões `users:create` e `users:update` para proteger operações administrativas sobre usuários.
- Proteção da role `OWNER`: Usuários (mesmo administradores) não podem remover a role `OWNER` do próprio perfil, garantindo que o tenant não fique sem dono.
- Operações de remoção substituídas por soft delete (`active: false`).
- Desativação de um usuário revoga automaticamente as sessões e refresh tokens vinculados (Ação em cascata).

### Phase 3C
Phase 3C — Roles, Permissions & Tenant Settings Foundation has been implemented.
This included:
- Visualização de Roles do tenant e permissões globais protegidas.
- Atualizações restritas em configurações do tenant (apenas nome e timezone) via permissão `tenant:update`.
- Interface gráfica reflete dinamicamente a presença de permissões (ocultando menus não autorizados).


### Atualização (Fase 3D)
Reforço sobre o modelo RBAC: todas as operações de escrita em entidades administrativas (Users, Roles, Permissions, Tenant Settings) devem validar a role no backend via `@RequirePermissions` (ex: `users:create`, `roles:manage`). O frontend apenas reflete a UX através do `PermissionGate` ou validação do store, sem substituir a checagem no backend.
