# Runbook — Jenkins deploy LedgerFlow em ctn01

## Objetivo

Publicar LedgerFlow no servidor `camargo@192.168.15.174`, dentro de `/home/camargo/apps/ledger-flow`, usando Jenkins + Docker Compose sem versionar nem transportar o `.env` real pelo pipeline.

## Premissas

- Jenkins possui acesso SSH ao servidor com a credencial `ledgerflow-ctn01-ssh`.
- O servidor tem Docker Compose disponível para o usuário `camargo`.
- O diretório remoto é `/home/camargo/apps/ledger-flow`.
- O arquivo remoto `/home/camargo/apps/ledger-flow/.env` é criado manualmente a partir de `.env.production.example`.
- Jenkins sincroniza código, mas exclui `.env`, `.git`, `node_modules` e builds locais.

## Portas padrão do LedgerFlow

| Serviço | Porta host | Observação |
|---|---:|---|
| Web | `5180` | Origem sugerida para `ledgerflow.lcamargo.dev.br` |
| API | `3010` | Origem sugerida para `api-ledgerflow.lcamargo.dev.br` |
| Postgres | `55432` | Evita conflito com Postgres existente em `5432` |
| MongoDB | `27018` | Porta auxiliar interna/operacional |
| Redis | `6380` | Porta auxiliar interna/operacional |
| RabbitMQ AMQP | `5682` | Uso interno/operacional |
| RabbitMQ Management | `15682` | Origem sugerida para `rabbitmq.lcamargo.dev.br` se exposto |
| Prometheus | `9091` | Evita conflito com Prometheus existente em `9090` |
| Grafana | `3002` | Dashboards operacionais |

## Primeiro deploy

1. Criar credencial SSH no Jenkins com id `ledgerflow-ctn01-ssh`.
2. Garantir que a chave pública correspondente acessa `camargo@192.168.15.174`.
3. Criar diretório remoto:

```bash
ssh camargo@192.168.15.174 "mkdir -p /home/camargo/apps/ledger-flow"
```

4. Copiar `.env.production.example` como referência e criar o `.env` real no servidor:

```bash
scp .env.production.example camargo@192.168.15.174:/home/camargo/apps/ledger-flow/.env.production.example
ssh camargo@192.168.15.174 "cp /home/camargo/apps/ledger-flow/.env.production.example /home/camargo/apps/ledger-flow/.env"
```

5. Editar `/home/camargo/apps/ledger-flow/.env` com segredos reais e URLs oficiais.
6. Executar o job Jenkins.

## Fluxo do Jenkinsfile

- Valida `docker-compose.prod.yml` com `.env.production.example`.
- Instala dependências em `apps/api` e `apps/web` usando cache local do workspace.
- Roda `npm run prisma:generate`, `npm test -- --runInBand` e `npm run build` na API.
- Roda `npm run test:unit -- --run`, `npm run i18n:check` e `npm run build` no Web.
- Sincroniza o workspace para o servidor via `rsync`.
- Falha se o `.env` remoto não existir.
- Salva snapshots de `docker compose ps` e `docker compose images` em `.deploy-backups`.
- Builda imagens no servidor.
- Sobe infraestrutura.
- Roda `prisma migrate deploy` pelo serviço `migrate`.
- Sobe `api`, `worker` e `web`.
- Verifica `http://127.0.0.1:3010/health/readiness` e `http://127.0.0.1:5180`.

## Cloudflare

Configurar os hostnames para apontar para as portas internas do servidor ou para o túnel Cloudflare existente:

- `ledgerflow.lcamargo.dev.br` -> `http://127.0.0.1:5180`
- `api-ledgerflow.lcamargo.dev.br` -> `http://127.0.0.1:3010`
- `rabbitmq.lcamargo.dev.br` -> `http://127.0.0.1:15682`, somente se a UI de gestão for exposta com proteção adequada
- `grafana-ledgerflow.lcamargo.dev.br` -> `http://127.0.0.1:3002`, somente se necessário

## Segurança

- Não colocar access token/refresh token de loja Mercado Livre no `.env`.
- Não versionar `.env`.
- Usar senhas fortes para Postgres, MongoDB, RabbitMQ, Grafana e JWT.
- Restringir RabbitMQ Management e Grafana por Cloudflare Access ou equivalente antes de expor publicamente.
- Manter `CORS_ORIGIN=https://ledgerflow.lcamargo.dev.br`.

## Rollback

O Jenkins salva evidências em `.deploy-backups`, mas rollback de imagem depende da tag anterior. Para voltar ao estado anterior:

```bash
cd /home/camargo/apps/ledger-flow
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=120 api web worker
```

Se o problema for crítico, restaurar a revisão anterior no Jenkins/Git e executar o job novamente.
