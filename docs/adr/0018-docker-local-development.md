# ADR-0018 — Estratégia de Desenvolvimento Local com Docker Compose

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow utiliza múltiplos serviços:

* API NestJS.
* Frontend Vue.
* PostgreSQL.
* MongoDB.
* Redis.
* RabbitMQ.
* Mailpit.
* Prometheus.
* Grafana.
* Workers.
* Integrações opcionais.

Configurar todos esses serviços manualmente em uma máquina local seria trabalhoso, propenso a erro e pouco adequado para portfólio.

Um avaliador técnico, recrutador ou outro desenvolvedor deve conseguir rodar o projeto com o mínimo de esforço.

O ambiente local precisa ser:

* Reproduzível.
* Documentado.
* Simples de iniciar.
* Próximo da arquitetura real.
* Isolado da máquina do desenvolvedor.
* Compatível com evolução futura.

---

## 2. Decisão

O LedgerFlow usará **Docker Compose** como estratégia principal para desenvolvimento local.

O comando principal será:

```bash
docker compose up --build
```

O ambiente local deverá subir os principais serviços necessários para desenvolvimento, testes e demonstração do projeto.

---

## 3. Serviços Locais

Serviços planejados:

```yaml
services:
  api:
  web:
  postgres:
  mongodb:
  redis:
  rabbitmq:
  mailpit:
  prometheus:
  grafana:
```

Workers poderão rodar:

* Dentro do processo da API em ambiente inicial.
* Como serviço separado em fase posterior.

Exemplo futuro:

```yaml
services:
  worker:
```

---

## 4. Portas Locais Sugeridas

```text
Frontend:       5173
Backend API:    3000
PostgreSQL:     5432
MongoDB:        27017
Redis:          6379
RabbitMQ UI:    15672
RabbitMQ AMQP:  5672
Mailpit UI:     8025
Prometheus:     9090
Grafana:        3001
```

---

## 5. Variáveis de Ambiente

O projeto deve possuir:

```text
.env.example
```

Regras:

* `.env.example` deve conter todas as variáveis necessárias.
* `.env` real não deve ser versionado.
* Valores de exemplo devem ser fictícios.
* README deve explicar como criar `.env`.
* Backend deve validar variáveis obrigatórias ao iniciar.

Exemplo:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://ledgerflow:ledgerflow@postgres:5432/ledgerflow
MONGODB_URL=mongodb://mongodb:27017/ledgerflow
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
ENCRYPTION_KEY=change-me-32-bytes-key

STRIPE_SECRET_KEY=sk_test_change_me
STRIPE_WEBHOOK_SECRET=whsec_change_me

SMTP_HOST=mailpit
SMTP_PORT=1025

PROMETHEUS_ENABLED=true
DATADOG_ENABLED=false
```

---

## 6. Volumes

Serviços de banco devem usar volumes para persistir dados localmente.

Exemplos:

```yaml
volumes:
  postgres_data:
  mongodb_data:
  redis_data:
  grafana_data:
```

Regras:

* Volumes devem ser nomeados.
* README deve explicar como resetar dados.
* Reset local deve ser simples.
* Não versionar dados gerados localmente.

---

## 7. Networks

Todos os serviços devem compartilhar uma rede Docker interna.

Exemplo:

```yaml
networks:
  ledgerflow_network:
```

Objetivos:

* Permitir comunicação por nome de serviço.
* Evitar dependência de localhost dentro dos containers.
* Isolar ambiente do host quando possível.

---

## 8. Health Checks

Serviços críticos devem possuir health checks quando possível.

Prioridade:

```text
postgres
mongodb
redis
rabbitmq
api
```

Objetivo:

* Evitar API iniciar antes do banco estar pronto.
* Melhorar confiabilidade do ambiente.
* Facilitar diagnóstico.

---

## 9. Migrações e Seed

O ambiente local deve permitir:

```bash
npm run prisma:migrate
npm run prisma:seed
```

ou comandos equivalentes dentro do container.

Regras:

* Migrations devem ser versionadas.
* Seed deve criar dados úteis para demonstração.
* Seed não deve conter segredos reais.
* README deve explicar como rodar migrations.

---

## 10. Mailpit

Mailpit será usado para e-mails locais.

Objetivo:

* Testar e-mails sem enviar mensagens reais.
* Validar templates.
* Validar recuperação de senha.
* Validar notificações de relatório.
* Validar alertas.

Acesso:

```text
http://localhost:8025
```

---

## 11. RabbitMQ

RabbitMQ deve expor UI local.

Acesso:

```text
http://localhost:15672
```

Uso:

* Visualizar filas.
* Ver mensagens.
* Ver DLQ.
* Validar consumers.
* Testar fluxo Outbox.

---

## 12. Prometheus e Grafana

Prometheus e Grafana devem estar disponíveis localmente.

Objetivo:

* Demonstrar observabilidade.
* Ver métricas da API.
* Ver métricas de filas.
* Criar prints para README.
* Validar comportamento sob carga.

Acessos sugeridos:

```text
Prometheus: http://localhost:9090
Grafana:    http://localhost:3001
```

---

## 13. Alternativas Consideradas

## 13.1 Instalação manual

### Vantagens

* Menos arquivos Docker.
* Mais controle direto da máquina.
* Pode ser simples para projetos pequenos.

### Desvantagens

* Difícil reproduzir.
* Propenso a erro.
* Demorado para novos usuários.
* Ruim para portfólio.
* Pode gerar conflito de versões locais.

---

## 13.2 Docker Compose

### Vantagens

* Ambiente reproduzível.
* Fácil para avaliadores.
* Simula arquitetura real.
* Isola serviços.
* Facilita documentação.
* Permite subir stack completa.
* Ótimo para portfólio.

### Desvantagens

* Exige Docker instalado.
* Pode consumir mais recursos.
* Arquivos de configuração precisam ser mantidos.
* Pode exigir ajustes por sistema operacional.

---

## 13.3 Kubernetes local

### Vantagens

* Mais próximo de produção cloud-native.
* Permite simular deploy avançado.
* Bom para sistemas complexos.

### Desvantagens

* Excessivo para o MVP.
* Mais difícil para avaliadores.
* Mais complexo de documentar.
* Desvia foco do produto.
* Aumenta barreira de entrada.

---

## 14. Consequências

## 14.1 Positivas

* Ambiente fácil de subir.
* Melhor experiência para quem avaliar o projeto.
* Menos dependência da máquina local.
* Demonstra maturidade.
* Facilita testes.
* Facilita observabilidade local.
* Facilita integração com RabbitMQ, Redis, MongoDB e PostgreSQL.

## 14.2 Negativas

* Mais arquivos de configuração.
* Mais consumo de memória.
* Necessidade de manter imagens atualizadas.
* Possíveis diferenças entre ambiente Docker e produção real.

---

## 15. Regras de Segurança Local

Mesmo localmente:

* Não versionar `.env`.
* Não usar segredos reais no repositório.
* Não usar chaves reais de produção.
* Não expor serviços localmente além do necessário.
* Usar credenciais fracas apenas em ambiente local.
* Deixar claro no README que credenciais locais não são de produção.

---

## 16. Critérios de Validação

Esta decisão será considerada correta se:

* `docker compose up --build` subir a stack.
* API responder `/health`.
* Frontend abrir localmente.
* PostgreSQL funcionar.
* MongoDB funcionar.
* Redis funcionar.
* RabbitMQ UI abrir.
* Mailpit abrir.
* Prometheus abrir.
* Grafana abrir.
* README documentar portas.
* `.env.example` estiver completo.
* Migrations e seed forem executáveis.

---

## 17. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto virar produto comercial.
* Houver ambiente de staging real.
* Houver deploy em cloud.
* Houver necessidade de Kubernetes.
* A stack crescer além do Docker Compose.

Possíveis evoluções futuras:

* Docker Compose separado por perfil.
* Profile `observability`.
* Profile `workers`.
* Kubernetes.
* Helm charts.
* Terraform.
* CI com containers.
* Deploy em VPS.
* Deploy em cloud.
