# 10.2.0B — Outbound webhooks

## Goal

Entregar eventos sanitizados do LedgerFlow para n8n/sistemas externos com HMAC, persistência, retry e DLQ.

## Tasks

- [x] Criar schema/migration de subscription e delivery → Prisma válido e índices tenant-safe.
- [x] Implementar segredo cifrado, rotação e proteção SSRF → testes sem exposição do segredo.
- [x] Implementar CRUD, envio de teste e rotação com RBAC/capability → Swagger e testes cross-tenant.
- [x] Criar delivery idempotente a partir de `NotificationEvent` → replay não duplica semanticamente.
- [x] Assinar `timestamp.rawBody` com HMAC-SHA256 → vetores de teste para n8n.
- [x] Implementar dispatcher, timeout, retry/backoff+jitter e DLQ → falhas transitórias e permanentes cobertas.
- [x] Implementar replay e métricas sanitizadas → autorização e auditoria verificadas.
- [x] Atualizar AsyncAPI, README, SDD, backlog e runbook → contratos e rollout documentados.
- [x] Executar testes, lint, build, Prisma e security scan → verificações da fase verdes e triagem registrada.

## Done When

- [x] Segredos e payloads externos brutos nunca aparecem em respostas ou logs.
- [x] Contrato permite ao n8n validar assinatura e deduplicar pelo idempotency key.
- [x] Indisponibilidade gera retry/DLQ sem perda ou duplicação semântica.
