# ADR-0007 — Uso de RabbitMQ para Processamento Assíncrono

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow possui diversas operações que não devem ser executadas diretamente dentro do ciclo de uma requisição HTTP.

Exemplos:

* Processar pagamento.
* Enviar e-mails.
* Enviar webhooks para clientes.
* Gerar relatórios pesados.
* Criar notificações.
* Reprocessar eventos.
* Executar retries.
* Encaminhar eventos da Outbox.
* Processar integrações externas.

Se essas tarefas forem executadas diretamente na requisição, o sistema pode sofrer com:

* Latência alta.
* Timeouts.
* Experiência ruim para o usuário.
* Baixa resiliência.
* Dificuldade de retry.
* Falhas parciais difíceis de tratar.
* Acoplamento forte entre fluxo principal e tarefas secundárias.

Em sistemas financeiros, é comum separar a confirmação inicial de uma operação do processamento assíncrono subsequente.

---

## 2. Decisão

O LedgerFlow utilizará **RabbitMQ** como broker de mensageria principal para processamento assíncrono.

RabbitMQ será usado para:

* Publicação de eventos internos.
* Consumo por workers.
* Retry.
* Dead Letter Queue.
* Separação entre API e tarefas demoradas.
* Integração com Outbox Pattern.
* Processamento de e-mails.
* Processamento de webhooks outbound.
* Processamento de relatórios.
* Notificações internas.

---

## 3. Filas Planejadas

```text
payments.processing.queue
emails.sending.queue
webhooks.dispatch.queue
reports.export.queue
notifications.queue
outbox.publisher.queue
```

---

## 4. Exchanges Planejadas

```text
ledgerflow.events.exchange
ledgerflow.dlx.exchange
```

---

## 5. Eventos Iniciais

```text
payment.created
payment.approved
payment.failed
payment.refunded
email.send.requested
webhook.dispatch.requested
report.export.requested
notification.created
api_key.created
gateway.changed
```

---

## 6. Payload Padrão de Mensagem

Todas as mensagens devem possuir metadados mínimos.

```json
{
  "eventId": "uuid",
  "eventType": "payment.created",
  "tenantId": "tenant-id",
  "traceId": "01HZ...",
  "occurredAt": "2026-06-12T18:30:00.000Z",
  "payload": {
    "paymentId": "payment-id"
  }
}
```

---

## 7. Regras da Mensageria

1. Toda mensagem deve possuir `eventId`.
2. Toda mensagem deve possuir `eventType`.
3. Toda mensagem deve possuir `traceId`.
4. Toda mensagem multitenant deve possuir `tenantId`.
5. Consumers devem ser idempotentes.
6. Falhas devem gerar retry.
7. Falhas definitivas devem ir para DLQ.
8. Mensagens não devem conter segredos.
9. Mensagens não devem conter tokens.
10. Mensagens devem conter apenas o necessário para o processamento.

---

## 8. Retry e Dead Letter Queue

O sistema deve aplicar retry com backoff para falhas temporárias.

Exemplos de falhas temporárias:

* API externa indisponível.
* Timeout.
* Erro 429.
* Erro 502.
* Erro 503.
* Falha temporária de SMTP.

Exemplos de falhas definitivas:

* Payload inválido.
* Endpoint inexistente.
* Permissão revogada.
* Credencial inválida.
* Evento incompatível.

Mensagens que excederem o limite de tentativas devem ir para DLQ.

---

## 9. Relação com Outbox Pattern

Eventos críticos não devem ser publicados diretamente no RabbitMQ dentro do use case principal.

Fluxo correto:

```text
Use Case
  ↓
PostgreSQL Transaction
  ↓
Salva entidade principal
  ↓
Salva OutboxEvent
  ↓
Commit
  ↓
Outbox Worker
  ↓
RabbitMQ
  ↓
Consumer
```

Isso reduz risco de perda de evento quando o banco confirma uma operação, mas o broker está indisponível.

---

## 10. Alternativas Consideradas

## 10.1 Processamento síncrono

### Vantagens

* Mais simples.
* Menos infraestrutura.
* Menos workers.

### Desvantagens

* Requisições lentas.
* Maior risco de timeout.
* Sem retry robusto.
* Pior experiência do usuário.
* Menor resiliência.

---

## 10.2 BullMQ com Redis

### Vantagens

* Simples para jobs.
* Boa integração com Node.js.
* Usa Redis já presente na stack.
* Bom para filas de background.

### Desvantagens

* Menos adequado para simular arquitetura enterprise com exchanges e routing.
* Menos expressivo para padrões de mensageria mais amplos.
* Redis já terá outras responsabilidades no projeto.
* RabbitMQ demonstra melhor arquitetura baseada em eventos.

---

## 10.3 Kafka

### Vantagens

* Excelente para alto volume.
* Bom para event streaming.
* Retenção de eventos.
* Muito usado em arquiteturas distribuídas.

### Desvantagens

* Complexidade maior.
* Mais pesado para ambiente local.
* Exige outra mentalidade operacional.
* Pode ser excessivo para o MVP.
* RabbitMQ atende melhor os casos de fila, retry e workers do projeto.

---

## 10.4 RabbitMQ

### Vantagens

* Excelente para filas de trabalho.
* Suporta exchanges, routing keys e DLQ.
* Mais simples que Kafka para esse cenário.
* Muito usado em sistemas corporativos.
* Fácil de rodar localmente via Docker.
* Bom para demonstrar mensageria enterprise.
* Integra bem com NestJS.

### Desvantagens

* Não é um event log como Kafka.
* Retenção longa não é seu foco principal.
* Exige cuidado com acknowledgements.
* Exige configuração correta de DLQ e retry.

---

## 11. Consequências

## 11.1 Positivas

* Requisições HTTP ficam mais rápidas.
* Tarefas demoradas são executadas por workers.
* Falhas podem ser retentadas.
* Sistema ganha resiliência.
* Fluxos ficam mais desacoplados.
* Projeto demonstra maturidade enterprise.
* Mensagens podem ser monitoradas.
* DLQ permite investigação de falhas.

## 11.2 Negativas

* Mais infraestrutura no Docker Compose.
* Mais complexidade de desenvolvimento.
* Necessário monitorar filas.
* Necessário garantir idempotência nos consumers.
* Necessário documentar eventos e routing keys.

---

## 12. Observabilidade

RabbitMQ deve ser monitorado com métricas como:

* Quantidade de mensagens prontas.
* Quantidade de mensagens não confirmadas.
* Quantidade de mensagens por fila.
* Quantidade de mensagens em DLQ.
* Taxa de publicação.
* Taxa de consumo.
* Tempo médio de processamento.
* Falhas por consumer.
* Número de retries.

Logs dos consumers devem conter:

```json
{
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "eventId": "event-id",
  "eventType": "email.send.requested",
  "consumer": "EmailConsumer",
  "status": "processed"
}
```

---

## 13. Segurança

Mensagens RabbitMQ não devem conter:

* Senhas.
* Tokens JWT.
* Refresh tokens.
* API Keys completas.
* Secret keys.
* Dados completos de cartão.
* CVV.
* Informações sensíveis desnecessárias.

Quando necessário, a mensagem deve carregar apenas IDs internos, e o consumer busca os dados no banco com segurança.

---

## 14. Critérios de Validação

Esta decisão será considerada correta se:

* Tarefas demoradas forem processadas fora do HTTP.
* Eventos críticos forem publicados via Outbox.
* Consumers forem idempotentes.
* DLQ funcionar.
* Retry funcionar.
* Mensagens possuírem `traceId`.
* RabbitMQ subir via Docker Compose.
* README documentar filas, exchanges e routing keys.
* Prometheus/Grafana exibirem métricas de filas.

---

## 15. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O volume de eventos exigir Kafka.
* Houver necessidade de replay longo de eventos.
* O sistema migrar para arquitetura event streaming.
* RabbitMQ se tornar gargalo.
* O produto comercial exigir retenção prolongada de eventos.

Possíveis evoluções futuras:

* Kafka.
* NATS.
* SQS/SNS.
* EventBridge.
* Debezium.
* CDC.
