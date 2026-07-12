# 10.2.0A — Notification Center interno

## Goal

Entregar notificações internas idempotentes, tenant-safe e autorizadas, com feed, contador, sino e estados por destinatário.

## Tasks

- [ ] Fixar contratos, categorias, severidades e matriz de audiência → validar contra PRD/SDD/ADR 0036.
- [ ] Criar schema/migration de evento e destinatário, além de permission/capability → `prisma validate` e migration test.
- [ ] Implementar criação idempotente e resolução de audiência → testes de duplicata, tenant, RBAC e capability.
- [ ] Implementar feed cursor-based, contador, leitura, leitura em massa e descarte → testes de autorização revogada e convergência.
- [ ] Documentar APIs no Swagger/Redoc e evento realmente publicado no AsyncAPI → validar artefatos gerados.
- [ ] Implementar sino, versão e `/notifications` com componentes existentes → testes de loading, empty, error e badge `99+`.
- [ ] Adicionar pt-BR/en-US e produtores mínimos protegidos por feature flag → auditoria i18n e testes de flag.
- [ ] Atualizar README, índices, PRD/SDD/backlog/runbook e UI docs → revisão de status e links.
- [ ] Executar a verificação transversal da sprint → API/Web tests, lint, type-check e builds verdes.

## Done When

- [ ] Contador e feed usam a mesma política de visibilidade.
- [ ] Nenhuma notificação cruza tenant ou permanece visível após perda de autorização.
- [ ] A mesma idempotency key não duplica evento nem destinatário.
- [ ] O footer funciona expandido e colapsado, com foco acessível e traduções completas.
