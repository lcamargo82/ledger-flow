# 10.2.1 — Advanced Inventory Foundation

## Goal

Preparar autorização, contratos traduzíveis e rollout seguro de transferências e inventários cíclicos sem criar agregados operacionais nem alterar saldos.

## Tasks

- [x] Registrar capabilities estreitas e entitlements por plano.
- [x] Criar permissões idempotentes em seed/migration e vinculá-las a OWNER.
- [x] Implementar reason-code registry fechado, estável e traduzível.
- [x] Implementar flags backend/frontend desligadas por padrão.
- [x] Expor status e reason codes com Swagger, permission e capability.
- [x] Registrar rotas/menu somente quando flags e entitlements estiverem ativos.
- [x] Exibir foundation state explícito, sem aparentar workflow concluído.
- [x] Atualizar PT-BR/en-US e documentação operacional/técnica.
- [x] Executar regressão completa, lint, builds, i18n, Prisma e migration local.

## Done When

- [x] Nenhum model de transferência/contagem ou movimento de estoque é criado nesta fase.
- [x] Backend continua como autoridade de autorização e falha fechado quando flag estiver desligada.
- [x] Frontend não registra nem exibe rotas sem flag e entitlement.
- [x] Reason codes são códigos de domínio; textos permanecem nas traduções.
