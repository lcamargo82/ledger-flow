# ADR 0035 — Mercado Livre como Adapter e Configuração Segura por Tenant

**Status:** Accepted  
**Data:** 2026-07-02

## Contexto
LedgerFlow possui domínio genérico de catálogo, estoque, pedidos, channels e financeiro operacional. É necessário separar infraestrutura global de credenciais operacionais por tenant.

## Decisão
- Mercado Livre será adapter de Channels.
- Client ID/client secret/callback base URL pertencem a `.env` da aplicação.
- Access/refresh tokens de lojistas nunca ficam em `.env` como operação normal.
- Cada conta conectada cria um `ChannelIntegration` tenant-scoped pelo painel.
- Tokens ficam em `encryptedCredentials`, protegidos pelo serviço central versionado de criptografia.
- OAuth state usa Redis, TTL curto, vínculo tenant/usuário e consumo atômico.
- Refresh é backend-only, com lock distribuído, round-trip e update atômico/versionado.
- Falha revogada/inválida vira `REAUTH_REQUIRED`; sem retry infinito.
- Disconnect invalida/remove credenciais e bloqueia jobs futuros.
- Platform Admin não vê nem edita tokens de tenant.
- Adapter chama application services, nunca repositórios internos de Inventory/Orders.
- Sync usa desired state, coalescência, rate policy, retry+jitter e circuit breaker.

## Consequências
Positivas: múltiplas contas futuras, menor risco de vazamento, reconexão segura, domínio provider-agnostic.

Negativas: lifecycle de token mais robusto, dependência de Redis/locks e UX de reautenticação.

## Alternativas rejeitadas
- Token de lojista em env.
- Fallback global quando conexão tenant não existe.
- Token entregue ao frontend.
- Refresh no browser.
- Lógica Mercado Livre dentro de Orders/Inventory.
- Webhook atualizando estoque síncronamente.
