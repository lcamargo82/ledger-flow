# 10.2.0B — Outbound webhooks

## Goal

Entregar eventos sanitizados do LedgerFlow para n8n/sistemas externos com HMAC, persistência, retry e DLQ.

## Tasks

- [ ] Criar schema/migration de subscription e delivery → Prisma válido e índices tenant-safe.
- [ ] Implementar segredo cifrado, rotação e proteção SSRF → testes sem exposição do segredo.
- [ ] Implementar CRUD/test de subscriptions com RBAC/capability → Swagger e testes cross-tenant.
- [ ] Criar delivery idempotente a partir de `NotificationEvent` → replay não duplica semanticamente.
- [ ] Assinar `timestamp.rawBody` com HMAC-SHA256 → vetores de teste para n8n.
- [ ] Implementar dispatcher, timeout, retry/backoff+jitter e DLQ → falhas transitórias e permanentes cobertas.
- [ ] Implementar replay e métricas sanitizadas → autorização e auditoria verificadas.
- [ ] Atualizar AsyncAPI, README, SDD, backlog e runbook → contratos e rollout documentados.
- [ ] Executar testes, lint, build, Prisma e security scan → todas as verificações verdes.

## Done When

- [ ] Segredos e payloads externos brutos nunca aparecem em respostas ou logs.
- [ ] n8n valida assinatura e deduplica pelo idempotency key.
- [ ] Indisponibilidade gera retry/DLQ sem perda ou duplicação semântica.
