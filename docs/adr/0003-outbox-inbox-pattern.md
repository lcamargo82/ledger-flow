# ADR-0003 — Uso de Outbox Pattern e Inbox Pattern para Confiabilidade de Eventos

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow possui fluxos críticos baseados em eventos:

* Criação de pagamentos.
* Atualização de status por webhook.
* Envio de e-mails.
* Envio de webhooks para clientes.
* Exportação de relatórios.
* Notificações internas.
* Auditoria.
* Processamento assíncrono por RabbitMQ.

Em sistemas financeiros, não é aceitável perder eventos ou processá-los de forma duplicada sem controle.

Um problema clássico ocorre quando o sistema salva uma transação no banco, mas falha ao publicar o evento correspondente na fila.

Exemplo:

```text id="yfkb06"
1. Usuário cria pagamento.
2. API salva pagamento no PostgreSQL.
3. API tenta publicar evento payment.created no RabbitMQ.
4. RabbitMQ está temporariamente indisponível.
5. Pagamento foi criado, mas nenhum worker será notificado.
```

Outro problema comum ocorre com webhooks externos.

Gateways como Stripe podem enviar o mesmo evento mais de uma vez. Além disso, eventos podem chegar fora de ordem ou falhar no processamento.

Exemplo:

```text id="b4w6gj"
1. Stripe envia payment_intent.succeeded.
2. LedgerFlow processa o evento.
3. Stripe reenvia o mesmo evento.
4. Sem idempotência, o sistema pode processar duas vezes.
```

Para reduzir esses riscos, o LedgerFlow adotará **Outbox Pattern** e **Inbox Pattern**.

---

## 2. Decisão

O LedgerFlow usará:

* **Outbox Pattern** para eventos internos que precisam ser publicados em filas.
* **Inbox Pattern** para eventos externos recebidos por webhooks.

Esses padrões serão implementados usando PostgreSQL para controle transacional e MongoDB para armazenamento de payloads brutos e auditoria detalhada.

---

# 3. Outbox Pattern

## 3.1 Objetivo

Garantir que eventos internos não sejam perdidos quando uma operação de banco for concluída.

O evento será salvo em uma tabela `outbox_events` dentro da mesma transação da operação principal.

Depois, um worker será responsável por publicar eventos pendentes no RabbitMQ.

---

## 3.2 Fluxo

```text id="3pdp27"
Use Case
  ↓
Inicia transação PostgreSQL
  ↓
Salva entidade principal
  ↓
Salva outbox_event
  ↓
Commit
  ↓
Outbox Worker lê eventos pendentes
  ↓
Publica no RabbitMQ
  ↓
Marca evento como PUBLISHED
```

---

## 3.3 Exemplo de uso

Ao criar um pagamento:

```text id="m5hb1j"
1. Salva payment.
2. Salva payment_event.
3. Salva outbox_event com event_type payment.created.
4. Commit.
5. Worker publica payment.created.
6. Consumers processam e-mail, notificação, webhook etc.
```

---

## 3.4 Tabela `outbox_events`

```text id="hf1ty2"
outbox_events
├── id
├── tenant_id
├── aggregate_type
├── aggregate_id
├── event_type
├── payload
├── status
├── attempts
├── last_error
├── published_at
├── created_at
└── updated_at
```

---

## 3.5 Status

```text id="ot366u"
PENDING
PUBLISHED
FAILED
```

---

## 3.6 Regras

1. Eventos críticos devem ser persistidos na Outbox.
2. A criação do evento deve ocorrer na mesma transação da operação principal.
3. O worker deve publicar apenas eventos pendentes.
4. O worker deve ser idempotente.
5. Eventos publicados devem ser marcados como `PUBLISHED`.
6. Falhas devem aumentar `attempts`.
7. Falhas definitivas devem marcar o evento como `FAILED`.
8. Logs devem conter `traceId`.
9. Mensagens publicadas devem conter `eventId`, `tenantId` e `traceId`.
10. O payload não deve conter dados sensíveis desnecessários.

---

# 4. Inbox Pattern

## 4.1 Objetivo

Garantir que eventos externos recebidos por webhooks sejam processados de forma segura, rastreável e idempotente.

---

## 4.2 Fluxo

```text id="dn17sj"
Recebe webhook externo
  ↓
Valida assinatura
  ↓
Calcula/verifica external_event_id
  ↓
Salva inbox_event
  ↓
Verifica duplicidade
  ↓
Processa evento
  ↓
Atualiza entidades internas
  ↓
Registra auditoria
  ↓
Marca como PROCESSED
```

---

## 4.3 Exemplo de uso

Ao receber um evento do Stripe:

```text id="dudt0o"
1. Recebe payment_intent.succeeded.
2. Valida stripe-signature.
3. Verifica event.id do Stripe.
4. Salva inbox_event.
5. Verifica se event.id já foi processado.
6. Atualiza payment para PAID.
7. Registra PaymentEvent.
8. Salva payload bruto no MongoDB.
9. Marca inbox_event como PROCESSED.
```

---

## 4.4 Tabela `inbox_events`

```text id="28sdh4"
inbox_events
├── id
├── tenant_id
├── provider
├── external_event_id
├── event_type
├── payload_reference
├── status
├── attempts
├── last_error
├── received_at
├── processed_at
├── created_at
└── updated_at
```

---

## 4.5 Status

```text id="lyssml"
RECEIVED
PROCESSING
PROCESSED
FAILED
IGNORED
```

---

## 4.6 Regras

1. Webhook sem assinatura válida deve ser rejeitado.
2. Evento recebido deve ser registrado antes de processamento complexo.
3. Evento duplicado deve ser ignorado com segurança.
4. O payload bruto deve ser salvo no MongoDB.
5. O PostgreSQL deve armazenar referência ao payload bruto.
6. Eventos com falha devem ficar disponíveis para investigação.
7. Reprocessamento deve exigir permissão.
8. Processamento deve ser idempotente.
9. Eventos fora de ordem devem ser tratados com cautela.
10. Logs devem conter `traceId`.

---

# 5. Alternativas Consideradas

## 5.1 Publicar diretamente no RabbitMQ após salvar no banco

### Vantagens

* Mais simples.
* Menos tabelas.
* Menos workers.

### Desvantagens

* Pode perder eventos se RabbitMQ estiver indisponível.
* Difícil garantir consistência.
* Dificulta reprocessamento.
* Menor auditabilidade.

---

## 5.2 Processar webhooks diretamente no controller

### Vantagens

* Mais rápido de implementar.
* Menos camadas.
* Menos persistência.

### Desvantagens

* Risco de timeout.
* Dificuldade para reprocessar.
* Dificuldade para rastrear falhas.
* Risco de processar duplicado.
* Menor segurança operacional.

---

## 5.3 Usar Outbox + Inbox

### Vantagens

* Mais confiável.
* Mais auditável.
* Melhor para sistemas financeiros.
* Facilita reprocessamento.
* Reduz risco de perda de evento.
* Reduz risco de duplicidade.
* Demonstra maturidade enterprise.

### Desvantagens

* Mais tabelas.
* Mais workers.
* Mais complexidade.
* Exige limpeza e monitoramento.
* Exige bom controle de status.

---

# 6. Consequências

## 6.1 Consequências Positivas

* Eventos internos não serão perdidos facilmente.
* Webhooks duplicados serão tratados.
* Falhas serão rastreáveis.
* Reprocessamento será possível.
* O sistema ficará mais confiável.
* A arquitetura será mais próxima de sistemas financeiros reais.
* O projeto terá maior valor técnico para portfólio.

## 6.2 Consequências Negativas

* O desenvolvimento será mais longo.
* Haverá mais tabelas e workers.
* Será necessário criar monitoramento para eventos pendentes.
* Será necessário definir política de limpeza ou retenção.
* Será necessário cuidado com dados sensíveis no payload.

---

# 7. Eventos que Usarão Outbox

Eventos iniciais:

```text id="odzh7j"
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

# 8. Eventos que Usarão Inbox

Eventos iniciais recebidos do Stripe:

```text id="h8rvwq"
payment_intent.succeeded
payment_intent.payment_failed
charge.refunded
customer.subscription.created
customer.subscription.deleted
```

---

# 9. Segurança

## 9.1 Outbox

* Payloads não devem conter segredos.
* API Keys não devem ser publicadas em eventos.
* Tokens não devem ir para RabbitMQ.
* Dados pessoais devem ser minimizados.
* Mensagens devem conter apenas o necessário.

## 9.2 Inbox

* Webhooks devem validar assinatura.
* Payload bruto deve ser armazenado com controle de acesso.
* Payloads exibidos no frontend devem ser mascarados quando necessário.
* Reprocessamento deve exigir permissão.
* Eventos inválidos devem ser registrados sem expor dados sensíveis.

---

# 10. Observabilidade

A implementação deve expor métricas como:

* Quantidade de eventos pendentes na Outbox.
* Quantidade de eventos publicados.
* Quantidade de eventos com falha.
* Tempo médio até publicação.
* Quantidade de webhooks recebidos.
* Quantidade de webhooks duplicados.
* Quantidade de webhooks rejeitados.
* Quantidade de eventos em DLQ.

Logs devem conter:

```json id="vgm6dp"
{
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "eventId": "event-id",
  "eventType": "payment.created",
  "status": "PUBLISHED"
}
```

---

# 11. Critérios de Validação

Esta decisão será considerada correta se:

* Eventos críticos forem salvos na Outbox.
* Eventos não forem perdidos quando RabbitMQ estiver temporariamente indisponível.
* Worker publicar eventos pendentes com segurança.
* Webhooks duplicados forem ignorados.
* Eventos externos forem rastreáveis.
* Falhas puderem ser investigadas.
* Reprocessamento puder ser feito com controle.
* Métricas e logs permitirem diagnóstico operacional.

---

# 12. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O volume de eventos crescer muito.
* O PostgreSQL se tornar gargalo para Outbox/Inbox.
* For necessário usar Kafka ou outro event log.
* O módulo de eventos for extraído para serviço próprio.
* Houver necessidade de retenção longa e analytics avançado.

Possíveis evoluções futuras:

* Kafka para event streaming.
* Debezium para Change Data Capture.
* Retenção automatizada.
* Dashboard operacional de eventos.
* Reprocessamento em lote.
* Replay de eventos.
