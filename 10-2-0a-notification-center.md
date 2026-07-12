# 10.2.0A — Notification Center interno

## Goal

Entregar notificações internas idempotentes, tenant-safe e autorizadas, com feed, contador, sino e estados por destinatário.

## Tasks

- [x] Fixar contratos, categorias, severidades e matriz de audiência → validado contra PRD/SDD/ADR 0036.
- [x] Criar schema/migration de evento e destinatário, além de permission/capability → schema validado; migration pendente de staging.
- [x] Implementar criação idempotente e resolução de audiência → testes de duplicata, concorrência, tenant, RBAC e capability.
- [x] Implementar feed cursor-based, contador, leitura, leitura em massa e descarte → autorização revogada e convergência cobertas.
- [x] Documentar APIs no Swagger/Redoc; AsyncAPI não alterado porque não há publisher assíncrono nesta fase.
- [x] Implementar sino, versão e `/notifications` com componentes existentes → loading, empty, error e badge `99+`.
- [x] Adicionar pt-BR/en-US e produtores mínimos protegidos por feature flag → auditoria i18n e testes de flag.
- [x] Atualizar README, índices, PRD/SDD/backlog/runbook e UI docs → status e configuração revisados.
- [ ] Executar a verificação transversal da sprint → API/Web tests, lint, type-check e builds verdes.

## Done When

- [ ] Contador e feed usam a mesma política de visibilidade.
- [ ] Nenhuma notificação cruza tenant ou permanece visível após perda de autorização.
- [ ] A mesma idempotency key não duplica evento nem destinatário.
- [ ] O footer funciona expandido e colapsado, com foco acessível e traduções completas.
