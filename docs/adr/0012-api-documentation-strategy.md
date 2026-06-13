# ADR-0012 — Estratégia de Documentação com Swagger, Redoc, AsyncAPI, ADRs e Runbooks

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow possui múltiplas interfaces técnicas:

* API REST.
* Eventos assíncronos.
* Filas RabbitMQ.
* Webhooks inbound.
* Webhooks outbound.
* Autenticação JWT.
* API Keys.
* Exportações.
* Integrações com gateways externos.
* Workers.
* Observabilidade.
* Runbooks operacionais.

Documentar apenas endpoints HTTP não é suficiente para um sistema desse tipo.

O projeto também tem finalidade de portfólio, então a documentação precisa demonstrar maturidade técnica e clareza arquitetural.

---

## 2. Decisão

O LedgerFlow utilizará uma estratégia de documentação composta por:

* **Swagger/OpenAPI** para documentação interativa da API REST.
* **Redoc** para documentação pública mais elegante da API.
* **AsyncAPI** para eventos, filas e webhooks.
* **ADRs** para decisões arquiteturais.
* **Runbooks** para procedimentos operacionais.
* **Diagramas C4** para arquitetura.
* **README profissional** para apresentação geral.
* **Collections Postman/Insomnia** para testes manuais.

---

## 3. Swagger/OpenAPI

Swagger é gerado a partir dos decorators do NestJS (`@nestjs/swagger`) e usado para ambiente de desenvolvimento.

Rota Swagger UI:

```text
/api/docs
```

Rota OpenAPI JSON:

```text
/api/openapi.json
```

Objetivos:

* Testar endpoints.
* Visualizar DTOs documentados com `@ApiProperty`.
* Validar autenticação (uso de `@ApiBearerAuth`).
* Facilitar desenvolvimento.
* Demonstrar rotas da API com tags por módulo.

Regras de Implementação:

* OpenAPI será gerado a partir dos decorators do NestJS.
* Swagger UI ficará em `/api/docs`.
* OpenAPI JSON ficará em `/api/openapi.json`.
* DTOs devem ser documentados com `@ApiProperty`.
* Endpoints protegidos devem usar `@ApiBearerAuth`.
* Cada módulo deve possuir `@ApiTags`.
* A documentação deve ser atualizada junto de cada nova feature.

---

## 4. Redoc

Redoc será usado como referência mais profissional e legível.

Rota:

```text
/api/reference
```

Objetivos:

* Apresentar API de forma mais elegante.
* Simular documentação pública B2B.
* Melhorar aparência para portfólio.
* Facilitar leitura por desenvolvedores externos.

Regras:

* Deve usar o mesmo documento OpenAPI do Swagger.
* Deve estar disponível em ambiente local.
* Pode ser desabilitado em produção, se necessário.
* Deve ser citado no README.

---

## 5. AsyncAPI

AsyncAPI será usado para documentar comunicação assíncrona.

Deve documentar:

* Exchanges.
* Filas.
* Routing keys.
* Eventos.
* Payloads.
* Webhooks outbound.
* Mensagens de retry.
* DLQ.
* Contratos de eventos.

Exemplo de eventos:

```text
payment.created
payment.approved
payment.failed
payment.refunded
email.send.requested
webhook.dispatch.requested
report.export.requested
notification.created
```

Exemplo de estrutura documentada:

```yaml
channels:
  payment.created:
    publish:
      message:
        payload:
          type: object
          properties:
            eventId:
              type: string
            tenantId:
              type: string
            traceId:
              type: string
            occurredAt:
              type: string
              format: date-time
            payload:
              type: object
```

---

## 6. ADRs

ADRs serão usados para registrar decisões técnicas importantes.

Diretório:

```text
docs/adr/
```

ADRs iniciais:

```text
0001-architecture-style.md
0002-payment-gateway-abstraction.md
0003-outbox-inbox-pattern.md
0004-observability-stack.md
0005-multitenancy-model.md
0006-postgresql-and-mongodb.md
0007-rabbitmq-for-async-processing.md
0008-error-handling-strategy.md
0009-frontend-architecture.md
0010-dependency-governance.md
0011-date-timezone-strategy.md
0012-api-documentation-strategy.md
```

Cada ADR deve conter:

* Status.
* Contexto.
* Decisão.
* Alternativas consideradas.
* Consequências.
* Critérios de validação.
* Possível revisão futura.

---

## 7. Runbooks

Runbooks documentam como agir diante de problemas operacionais.

Diretório:

```text
docs/runbooks/
```

Runbooks planejados:

```text
webhook-failure.md
payment-reconciliation.md
report-export-failure.md
rabbitmq-dlq-reprocessing.md
gateway-unavailable.md
database-connection-failure.md
observability-troubleshooting.md
```

Exemplo de conteúdo de runbook:

* Sintoma.
* Possíveis causas.
* Como investigar.
* Dashboards relevantes.
* Logs relevantes.
* Queries úteis.
* Passos de correção.
* Quando escalar.
* Como validar recuperação.

---

## 8. Diagramas

O projeto deve conter diagramas para facilitar entendimento.

Diretório:

```text
docs/diagrams/
```

Diagramas planejados:

```text
c4-context.md
c4-container.md
database.md
queues.md
observability.md
payment-flow.md
webhook-flow.md
report-export-flow.md
```

Preferência inicial:

* Mermaid para versionamento simples em Markdown.
* C4 Model para visão de arquitetura.
* Diagramas simples e legíveis.

---

## 9. README Profissional

O README principal deve ser a vitrine do projeto.

Deve conter:

* Nome e descrição.
* Problema de negócio.
* Stack.
* Arquitetura.
* Como rodar.
* Portas locais.
* Variáveis de ambiente.
* Fluxos principais.
* Segurança.
* Observabilidade.
* Documentação.
* Testes.
* Roadmap.
* Prints.
* Links para PRD, SDD, ADRs e backlog.

---

## 10. Collections Postman/Insomnia

O projeto deve disponibilizar collection para testes manuais.

Objetivos:

* Facilitar validação da API.
* Ajudar recrutadores ou avaliadores.
* Acelerar testes locais.
* Demonstrar organização.

A collection deve incluir:

* Auth.
* Customers.
* Payments.
* Webhooks.
* Reports.
* Notifications.
* Gateways.
* API Keys.

---

## 11. Alternativas Consideradas

## 11.1 Apenas README

### Vantagens

* Mais simples.
* Menos arquivos.
* Rápido de manter.

### Desvantagens

* Insuficiente para sistema complexo.
* Não documenta eventos bem.
* Não registra decisões.
* Menor maturidade de portfólio.

---

## 11.2 Apenas Swagger

### Vantagens

* Boa documentação de API REST.
* Interativo.
* Fácil de testar.

### Desvantagens

* Não documenta bem filas.
* Não documenta decisões arquiteturais.
* Não documenta runbooks.
* Não é a melhor leitura para documentação pública.
* Não mostra maturidade completa do sistema.

---

## 11.3 Swagger + Redoc + AsyncAPI + ADRs + Runbooks

### Vantagens

* Documentação completa.
* API REST bem descrita.
* Eventos bem documentados.
* Decisões arquiteturais rastreáveis.
* Operação documentada.
* Excelente para portfólio.
* Aparência de projeto enterprise.

### Desvantagens

* Mais arquivos para manter.
* Exige disciplina.
* Pode ficar desatualizado se não for atualizado junto com código.
* Demanda tempo inicial maior.

---

## 12. Consequências

## 12.1 Positivas

* Melhor entendimento do projeto.
* Melhor experiência para avaliadores.
* Mais maturidade técnica.
* Facilidade para manutenção futura.
* Decisões ficam rastreáveis.
* Eventos assíncronos ficam claros.
* API fica fácil de testar.
* Operação fica documentada.

## 12.2 Negativas

* Mais manutenção.
* Mais risco de documentação ficar defasada.
* Mais tempo gasto fora do código.
* Necessidade de atualizar docs em cada feature relevante.

---

## 13. Regras de Manutenção

1. Toda nova rota relevante deve atualizar Swagger.
2. Todo novo evento deve atualizar AsyncAPI.
3. Toda nova decisão arquitetural relevante deve gerar ADR.
4. Toda operação crítica deve ter runbook.
5. README deve ser atualizado quando setup mudar.
6. Backlog deve refletir mudanças de escopo.
7. Diagramas devem ser atualizados quando arquitetura mudar.
8. PRs relevantes devem incluir atualização de documentação.

---

## 14. Critérios de Validação

Esta decisão será considerada correta se:

* Swagger estiver disponível em `/api/docs`.
* Redoc estiver disponível em `/api/reference`.
* AsyncAPI documentar eventos principais.
* ADRs estiverem versionados.
* README referenciar docs principais.
* Runbooks existirem para falhas críticas.
* Diagramas explicarem arquitetura.
* Uma pessoa externa conseguir entender e rodar o projeto.
* Documentação estiver alinhada ao comportamento real do sistema.

---

## 15. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto adotar portal de documentação próprio.
* O sistema virar produto comercial.
* Houver SDK público.
* Houver necessidade de versionamento público de API.
* Houver documentação para clientes externos reais.

Possíveis evoluções futuras:

* Portal com Docusaurus.
* Versionamento de API pública.
* SDK TypeScript.
* SDK PHP.
* Exemplos interativos.
* Mock server OpenAPI.
* Developer Portal.
