# ADR 003: Platform Audit and Support Foundation

## Status
Aceito

## Contexto
O sistema LedgerFlow opera em um modelo multi-tenant. À medida que o sistema cresce, administradores da plataforma ("Platform Admins") precisam da capacidade de:
1. Auditar eventos globais da plataforma (ex: provisionamento de novos tenants, falhas críticas de webhooks de gateways).
2. Fornecer suporte aos tenants clientes investigando incidentes e o "estado de saúde" (health) da conta de cada cliente.

Contudo, por razões estritas de privacidade e conformidade (LGPD, etc.), administradores da plataforma **não devem** ter acesso direto aos dados detalhados dos tenants (ex: PI ou dados financeiros granulares de `Customers` e `Payments`), e **não devem** poder fazer impersonation (assumir a identidade de um usuário do tenant) ou tenant switching.

## Decisão
1. **Auditoria Centralizada (AuditLog)**:
   - Expandimos o modelo `AuditLog` existente para suportar metadados mais ricos: `severity` (INFO, WARNING, CRITICAL), `actorType` (USER, PLATFORM_ADMIN, SYSTEM, WEBHOOK, WORKER), `source`, `summary`, e `traceId`.
   - Incluímos um índice composto `@@index([tenantId, createdAt])` para consultas de suporte eficientes.

2. **Endpoints Isolados para Plataforma**:
   - Foram criados endpoints sob a rota `/platform/*` específicos para uso dos administradores da plataforma.
   - Rotas "normais" da API (ex: `/payments`, `/customers`) permanecem rigorosamente limitadas ao escopo do tenant em que o request foi originado. A auditoria global ocorre fora desse escopo.

3. **Restrições de Acesso**:
   - Apenas usuários com a role `PLATFORM_OWNER` ou `isPlatformAdmin = true` têm acesso às rotas da plataforma, garantidas pelos decorators `@PlatformAdminOnly()` e `@RequirePermissions('platform:audit:read')`.
   - Administradores da plataforma visualizam informações em um painel isolado, não dentro da visão do tenant.

4. **Resumo de Suporte (Support Summary)**:
   - Em vez de visualizar pagamentos ou clientes detalhados para resolver tickets de suporte, o administrador visualiza um agregado (warnings recentes, falhas de webhook, saúde do tenant) e uma lista dos eventos de auditoria do tenant.

## Consequências
### Positivas
- Preserva a privacidade dos tenants isolando os dados de operação sensíveis.
- Previne vazamentos acidentais ou acessos não autorizados por equipe interna.
- Constrói uma base rastreável de eventos que será essencial para conformidade e SOC2.

### Negativas
- Em casos de suporte extremamente complexos que requerem análise de payloads de pagamentos específicos, o administrador não consegue ver a requisição sem pedir explicitamente logs de infraestrutura ou permissão do cliente. (Isso é uma escolha de design intencional para priorizar segurança sobre conveniência).

## Referências
- Implementação inicial da Fase P1.4 - Platform Audit & Support Foundation.
