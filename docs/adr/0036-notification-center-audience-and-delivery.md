# ADR 0036 — Notification Center com audiência autorizada e entrega durável

## Status

Proposto para 10.2.0.

## Contexto

O LedgerFlow precisa avisar usuários sobre eventos de pagamentos, estoque, canais, pedidos, conciliação e sistema. Uma notificação pode revelar informação de negócio; ocultá-la apenas no frontend não atende multitenancy/RBAC. O n8n/Telegram também precisa consumir fatos do LedgerFlow, não webhooks brutos de providers.

## Decisão

- Persistir `NotificationEvent` tenant-scoped e `NotificationRecipient` por usuário.
- Resolver audiência no backend usando usuário ativo, permissões e capabilities.
- Revalidar categoria/permissão na leitura.
- Persistir chaves i18n e argumentos sanitizados; localizar no frontend.
- Usar polling inicialmente; não introduzir WebSocket sem requisito de latência/escala medido.
- Entrega outbound usa subscription com segredo cifrado, HMAC, delivery persistida, idempotência, Outbox, retry e DLQ.
- n8n recebe DTO sanitizado e deduplicável; nunca recebe payload Mercado Livre bruto ou token.

## Alternativas consideradas

- **Frontend-only:** simples, mas inseguro e sem entrega durável.
- **Uma tabela por usuário:** duplica conteúdo e aumenta custo de escrita.
- **WebSocket imediato:** reduz latência, porém adiciona conexão/escala antes de necessidade comprovada.
- **n8n direto no provider:** duplica normalização, tenancy e idempotência fora do domínio.

## Consequências

- Duas tabelas internas e duas tabelas opcionais de outbound.
- Delivery-time e read-time authorization precisam compartilhar registry de políticas.
- Mudança de permissão pode ocultar recipients existentes, comportamento intencional.
- Polling deve usar intervalo razoável, visibility API e cancelamento ao sair da sessão.
