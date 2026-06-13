# ADR-0006 — Uso de PostgreSQL para Dados Transacionais e MongoDB para Auditoria e Payloads Brutos

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow lida com dois tipos principais de dados:

## 1.1 Dados transacionais e relacionais

São dados estruturados, com regras fortes de consistência.

Exemplos:

* Tenants.
* Usuários.
* Roles.
* Permissões.
* Clientes.
* Pagamentos.
* Assinaturas.
* Configurações de gateway.
* API Keys.
* Export jobs.
* Webhook endpoints.
* Outbox events.
* Inbox events.

Esses dados precisam de:

* Integridade referencial.
* Transações ACID.
* Índices.
* Consultas relacionais.
* Paginação.
* Ordenação.
* Filtros.
* Consistência forte.
* Controle por `tenantId`.

## 1.2 Dados semiestruturados, variáveis e volumosos

São dados que podem mudar conforme provider externo ou tipo de evento.

Exemplos:

* Payload bruto do Stripe.
* Payload bruto do Asaas.
* Payload bruto do Mercado Pago.
* Requests e responses externas.
* Webhooks recebidos.
* Snapshots de auditoria.
* Metadados específicos de provider.
* Logs ricos de eventos.

Esses dados geralmente:

* Têm estrutura variável.
* Podem ser grandes.
* Não precisam de join relacional frequente.
* São usados para investigação.
* São úteis para suporte e auditoria.
* Não devem poluir o modelo relacional principal.

---

## 2. Decisão

O LedgerFlow utilizará:

* **PostgreSQL** como banco principal para dados transacionais e relacionais.
* **MongoDB** como banco documental para auditoria, payloads brutos e dados semiestruturados.

O PostgreSQL será acessado via **Prisma**.

O MongoDB será usado por repositories específicos de auditoria e payloads externos.

---

## 3. Responsabilidades do PostgreSQL

O PostgreSQL armazenará os dados centrais da aplicação.

Entidades principais:

```text
Tenant
User
Role
Permission
UserRole
RolePermission
Customer
Payment
PaymentEvent
PaymentGatewayConfig
WebhookEndpoint
WebhookDelivery
ApiKey
ExportJob
Notification
OutboxEvent
InboxEvent
RefreshToken
```

Características:

* Dados normalizados.
* Relacionamentos claros.
* Transações.
* Índices.
* Paginação.
* Controle multitenant.
* Consistência forte.

---

## 4. Responsabilidades do MongoDB

O MongoDB armazenará dados semiestruturados.

Coleções planejadas:

```text
audit_logs
gateway_raw_payloads
webhook_raw_payloads
external_request_logs
```

Exemplos de documentos:

```json
{
  "id": "uuid",
  "tenantId": "tenant-id",
  "provider": "stripe",
  "eventType": "payment_intent.succeeded",
  "externalEventId": "evt_123",
  "traceId": "01HZ...",
  "payload": {
    "id": "evt_123",
    "type": "payment_intent.succeeded",
    "data": {}
  },
  "createdAt": "2026-06-12T18:30:00.000Z"
}
```

---

## 5. Relação entre PostgreSQL e MongoDB

O PostgreSQL deve armazenar apenas uma referência ao payload bruto quando necessário.

Exemplo:

```text
inbox_events.payload_reference = mongodb_document_id
payments.gateway_payload_reference = mongodb_document_id
```

Isso evita armazenar payloads grandes e variáveis dentro do PostgreSQL.

---

## 6. Alternativas Consideradas

## 6.1 Usar apenas PostgreSQL

### Vantagens

* Menos infraestrutura.
* Menos complexidade.
* Transações centralizadas.
* Backup mais simples.

### Desvantagens

* Payloads variáveis poluem o modelo relacional.
* Campos JSONB podem crescer sem controle.
* Auditoria volumosa pode prejudicar performance.
* Modelo pode ficar menos organizado.
* Difícil separar dados operacionais de dados de investigação.

## 6.2 Usar apenas MongoDB

### Vantagens

* Flexibilidade de estrutura.
* Bom para payloads variáveis.
* Simples para armazenar documentos externos.

### Desvantagens

* Menos adequado para regras financeiras relacionais.
* Integridade referencial mais fraca.
* Transações relacionais mais complexas.
* Paginação e filtros relacionais podem ficar piores.
* Menos adequado para RBAC, pagamentos e entidades críticas.

## 6.3 Usar PostgreSQL + MongoDB

### Vantagens

* Cada banco é usado no problema em que é mais adequado.
* PostgreSQL cuida da consistência transacional.
* MongoDB cuida de payloads variáveis.
* Auditoria fica separada do core.
* Modelo relacional fica mais limpo.
* Demonstra maturidade arquitetural.

### Desvantagens

* Mais infraestrutura.
* Mais conexões.
* Mais configuração.
* Mais cuidado com consistência entre referências.
* Mais documentação necessária.

---

## 7. Consequências

## 7.1 Positivas

* Melhor separação entre dados de negócio e dados de auditoria.
* Mais flexibilidade para armazenar payloads de diferentes providers.
* PostgreSQL permanece focado nos dados críticos.
* MongoDB permite investigação detalhada de eventos externos.
* O projeto demonstra uso consciente de persistência poliglota.

## 7.2 Negativas

* O Docker Compose terá mais um serviço.
* O backup ficará mais complexo.
* Será necessário manter repositories para dois bancos.
* Será necessário cuidado para não duplicar dados desnecessariamente.
* Será necessário definir políticas de retenção para payloads e auditoria.

---

## 8. Regras de Persistência

## 8.1 PostgreSQL

Usar para:

* Dados críticos.
* Dados financeiros normalizados.
* Dados que exigem consistência.
* Dados com relacionamento.
* Dados usados em listagens e relatórios principais.

Não usar para:

* Payload bruto grande.
* Logs de auditoria muito detalhados.
* Estruturas totalmente variáveis por provider.

## 8.2 MongoDB

Usar para:

* Payload bruto de gateway.
* Payload bruto de webhook.
* Logs ricos de auditoria.
* Requests/responses externos.
* Snapshots históricos.

Não usar como fonte principal para:

* Status atual de pagamento.
* Permissões.
* Usuários.
* Tenants.
* Dados financeiros normalizados.

---

## 9. Segurança

Dados sensíveis devem ser tratados com cuidado nos dois bancos.

Regras:

* Não armazenar dados completos de cartão.
* Não armazenar CVV.
* Não armazenar secrets em payload bruto sem mascaramento.
* Mascarar headers sensíveis.
* Mascarar tokens.
* Controlar acesso às coleções de auditoria.
* Payloads exibidos no frontend devem ser mascarados.
* Definir retenção para payloads antigos.
* Não logar dados sensíveis no console ou em ferramentas externas.

---

## 10. Timezones e Datas

Regras:

* PostgreSQL deve usar `TIMESTAMPTZ`.
* MongoDB deve armazenar datas em UTC.
* APIs devem trafegar datas em ISO 8601.
* Frontend deve exibir conforme timezone do usuário ou tenant.
* Relatórios devem informar o timezone utilizado.

---

## 11. Critérios de Validação

Esta decisão será considerada correta se:

* PostgreSQL armazenar dados transacionais.
* MongoDB armazenar payloads brutos e auditoria.
* Pagamentos tiverem dados normalizados no PostgreSQL.
* Payload bruto do gateway for salvo no MongoDB.
* Inbox events puderem referenciar payloads MongoDB.
* Relatórios principais não dependerem de varredura no MongoDB.
* Dados sensíveis forem mascarados.
* A arquitetura estiver documentada no SDD.

---

## 12. Possível Revisão Futura

Esta decisão poderá ser revista se:

* A operação com dois bancos se tornar desnecessária.
* PostgreSQL com JSONB atender plenamente ao volume real.
* O projeto virar produto comercial e exigir retenção diferenciada.
* A auditoria crescer demais e exigir storage especializado.
* Houver necessidade de data lake ou warehouse.

Possíveis evoluções futuras:

* PostgreSQL JSONB para payloads menores.
* S3-compatible storage para payloads grandes.
* Data warehouse para analytics.
* Retenção automática em MongoDB.
* Arquivamento frio de auditoria.
* Elasticsearch/OpenSearch para busca em logs.
