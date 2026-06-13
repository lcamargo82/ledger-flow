# ADR-0004 — Stack de Observabilidade com OpenTelemetry, Prometheus, Grafana e Datadog Opcional

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow simula uma plataforma financeira B2B com múltiplos fluxos críticos:

* Criação de pagamentos.
* Processamento de webhooks.
* Exportação de relatórios.
* Envio de e-mails.
* Envio de webhooks para clientes.
* Execução de workers assíncronos.
* Comunicação com gateways externos.
* Processamento por filas.
* Operações multitenant.

Em sistemas desse tipo, não basta saber que algo falhou. É necessário entender:

* Onde falhou.
* Quando falhou.
* Para qual tenant falhou.
* Qual usuário iniciou a ação.
* Qual evento foi processado.
* Qual fila participou do fluxo.
* Qual gateway externo respondeu com erro.
* Quanto tempo cada etapa levou.
* Se houve retry, DLQ ou timeout.

Sem observabilidade adequada, o sistema se torna difícil de operar, debugar e evoluir.

O projeto precisa demonstrar maturidade próxima de ambientes corporativos reais, mas sem depender exclusivamente de ferramentas pagas para funcionar localmente.

---

## 2. Decisão

O LedgerFlow adotará uma stack de observabilidade composta por:

* **Logs estruturados com Pino**.
* **TraceId por request e por evento assíncrono**.
* **OpenTelemetry** para tracing distribuído.
* **Prometheus** para coleta de métricas.
* **Grafana** para dashboards locais.
* **Datadog como integração opcional**, simulando APM corporativo proprietário.

Prometheus e Grafana serão a base local obrigatória.
Datadog será documentado como integração opcional, sem ser necessário para rodar o projeto.

---

## 3. Componentes da Solução

## 3.1 Logs Estruturados

Os logs devem ser emitidos em JSON.

Biblioteca sugerida:

```text
Pino
```

Campos mínimos:

```json
{
  "level": "info",
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "userId": "user-id",
  "route": "/payments",
  "method": "POST",
  "statusCode": 201,
  "durationMs": 120,
  "message": "Payment created"
}
```

Regras:

* Logs não devem conter dados sensíveis.
* Tokens não devem ser logados.
* Senhas não devem ser logadas.
* API Keys não devem ser logadas.
* Secrets de gateways não devem ser logados.
* Payloads sensíveis devem ser mascarados.
* Logs de erro devem conter stack apenas internamente.

---

## 3.2 TraceId

Toda request HTTP deve receber um `traceId`.

Esse `traceId` deve ser propagado para:

* Logs.
* Respostas de erro.
* Mensagens RabbitMQ.
* Workers.
* Eventos Outbox.
* Eventos Inbox.
* Chamadas para APIs externas.
* Auditoria.

Exemplo de erro:

```json
{
  "code": "PAYMENT_GATEWAY_UNAVAILABLE",
  "message": "Não foi possível processar o pagamento neste momento.",
  "traceId": "01HZM9R7G2W6P",
  "statusCode": 503,
  "timestamp": "2026-06-12T18:30:00.000Z",
  "path": "/payments"
}
```

O usuário pode informar o `traceId` ao suporte, e o time técnico consegue rastrear o fluxo completo.

---

## 3.3 OpenTelemetry

OpenTelemetry será usado para tracing.

Fluxos instrumentados:

* HTTP inbound.
* HTTP outbound.
* Prisma/PostgreSQL.
* RabbitMQ.
* Workers.
* Webhooks.
* Gateways externos.
* Exportações.
* E-mails.

Exemplo de fluxo rastreável:

```text
POST /payments
  ↓
PaymentService.create
  ↓
Prisma transaction
  ↓
StripeAdapter.createPayment
  ↓
MongoDB audit payload
  ↓
Outbox event
  ↓
RabbitMQ
  ↓
Notification consumer
```

Objetivo:

Permitir enxergar o tempo gasto em cada etapa e identificar gargalos.

---

## 3.4 Prometheus

Prometheus será usado para coleta de métricas.

Métricas técnicas:

* Total de requests HTTP.
* Latência por rota.
* Taxa de erro.
* Uso de memória.
* Uso de CPU.
* Tempo de queries.
* Tamanho das filas.
* Quantidade de mensagens em DLQ.
* Falhas em consumers.
* Tempo de processamento de workers.

Métricas de negócio:

* Pagamentos criados.
* Pagamentos aprovados.
* Pagamentos recusados.
* TPV.
* Taxa de aprovação.
* Reembolsos.
* Webhooks recebidos.
* Webhooks enviados.
* Webhooks com falha.
* Relatórios gerados.
* Tempo médio de processamento de pagamento.

---

## 3.5 Grafana

Grafana será usado para visualização.

Dashboards planejados:

```text
API Health Dashboard
Payments Business Dashboard
RabbitMQ Dashboard
PostgreSQL Dashboard
Redis Dashboard
Webhook Delivery Dashboard
Reports Export Dashboard
Workers Dashboard
```

O README deverá conter prints ou instruções para acessar os dashboards.

---

## 3.6 Datadog Opcional

Datadog será suportado como integração opcional para simular APM de mercado.

Regras:

* O projeto não deve depender do Datadog para funcionar.
* O ambiente local deve funcionar com Prometheus e Grafana.
* Datadog deve ser habilitado por variável de ambiente.
* Documentação deve explicar que ele é opcional.
* Traces OpenTelemetry devem poder ser enviados para o Datadog quando configurado.

Variáveis sugeridas:

```env
DATADOG_ENABLED=false
DD_SERVICE=ledgerflow-api
DD_ENV=development
DD_VERSION=1.0.0
```

---

## 4. Alternativas Consideradas

## 4.1 Apenas console.log

### Vantagens

* Muito simples.
* Nenhuma configuração adicional.
* Rápido para começar.

### Desvantagens

* Não é profissional.
* Difícil filtrar.
* Difícil correlacionar eventos.
* Não atende cenário enterprise.
* Não permite análise eficiente em falhas complexas.

## 4.2 Apenas logs estruturados

### Vantagens

* Melhor que console.log.
* Simples de implementar.
* Ajuda bastante no debug.

### Desvantagens

* Não mostra métricas.
* Não mostra traces distribuídos.
* Não permite dashboards de negócio.
* Não monitora filas e infraestrutura adequadamente.

## 4.3 Prometheus + Grafana apenas

### Vantagens

* Excelente para métricas.
* Roda localmente.
* Muito usado em ambientes reais.
* Sem custo inicial.

### Desvantagens

* Não resolve tracing sozinho.
* Logs precisam de solução separada.
* Pode exigir configuração adicional para dashboards.

## 4.4 OpenTelemetry + Prometheus + Grafana + Datadog opcional

### Vantagens

* Equilíbrio entre ambiente local e ambiente corporativo.
* Demonstra maturidade técnica.
* Permite logs, métricas e traces.
* Não depende de ferramenta paga.
* Datadog pode ser usado como diferencial de portfólio.

### Desvantagens

* Mais configuração.
* Mais serviços no Docker Compose.
* Mais curva de aprendizado.
* Pode ser excessivo se implementado cedo demais.

---

## 5. Consequências

## 5.1 Positivas

* Melhor diagnóstico de falhas.
* Mais clareza em fluxos assíncronos.
* Facilidade para demonstrar maturidade no portfólio.
* Monitoramento de negócio e infraestrutura.
* Possibilidade de rastrear uma request do frontend até o worker.
* Separação clara entre ambiente local e integração corporativa opcional.

## 5.2 Negativas

* Mais complexidade operacional.
* Mais ferramentas para configurar.
* Mais documentação necessária.
* Pode atrasar o MVP se implementado antes do fluxo principal.

---

## 6. Estratégia de Implementação

A observabilidade será implementada em fases:

## Fase 1

* Logs estruturados.
* TraceId por request.
* TraceId em erros.
* Sanitização de logs.

## Fase 2

* Métricas básicas da API.
* Prometheus.
* Grafana.
* Dashboard inicial.

## Fase 3

* Métricas de negócio.
* Métricas de RabbitMQ.
* Métricas de workers.
* Métricas de webhooks.

## Fase 4

* OpenTelemetry.
* Tracing HTTP.
* Tracing Prisma.
* Tracing RabbitMQ.
* Tracing de APIs externas.

## Fase 5

* Datadog opcional.
* Documentação de integração.
* Prints para portfólio.

---

## 7. Segurança

A stack de observabilidade deve respeitar as seguintes regras:

* Não logar secrets.
* Não logar tokens.
* Não logar senhas.
* Não logar chaves de API completas.
* Mascarar dados pessoais.
* Não expor dashboards sem autenticação em ambiente real.
* Não expor métricas sensíveis publicamente.
* Não enviar dados sensíveis para ferramentas externas sem controle.

---

## 8. Critérios de Validação

Esta decisão será considerada correta se:

* Toda request possuir `traceId`.
* Erros retornarem `traceId`.
* Logs forem emitidos em JSON.
* Logs não exibirem dados sensíveis.
* Prometheus coletar métricas.
* Grafana exibir dashboards úteis.
* Métricas de negócio forem visíveis.
* Workers preservarem contexto de rastreamento.
* Datadog puder ser habilitado opcionalmente.
* README documentar como acessar a observabilidade.

---

## 9. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto migrar para Kubernetes.
* For adotado Loki para logs.
* For adotado Jaeger ou Tempo para traces.
* O Datadog se tornar obrigatório em ambiente comercial.
* O volume de logs exigir uma solução dedicada.

Possíveis evoluções futuras:

* Grafana Loki.
* Grafana Tempo.
* Jaeger.
* Alertmanager.
* SLOs e SLIs.
* Dashboards por tenant.
* Alertas por erro crítico.
