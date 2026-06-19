# 0021. Unified Inbound Webhook Architecture

Date: 2026-06-19

## Status

Accepted

## Context

Na Fase 7A do desenvolvimento, estabelecemos uma fundação de webhooks específica para o Asaas (Sandbox). Com o avanço do sistema e o plano para dar suporte a múltiplos gateways de pagamento (Stripe, Mercado Pago, PagBank, Pagar.me), a abordagem de acoplar lógica do provedor em nossos Ingress Services e Controllers não é escalável nem manutenível.

Precisamos de uma arquitetura centralizada onde o comportamento comum seja o mesmo (idempotência, Inbox Pattern, Audit Logging), enquanto validações e mapeamentos particulares (verificação de assinatura, extração de payload) sejam delegados a implementações de domínio restritas.

## Decision

Decidimos criar uma **Unified Inbound Webhook Architecture**, caracterizada pelas seguintes propriedades:

1. **Agnosticismo de Provedor no Core**: O Ingress Service opera sob a forma de um `NormalizedWebhookEvent` padrão. Nenhum detalhe de provedor "vaza" para a lógica central de tratamento de entrada de pagamentos.
2. **Adapter Pattern**: Cada provedor de gateway terá sua própria classe que implementa a interface `ProviderWebhookAdapter`, providenciando dois métodos essenciais:
    - `authenticate`: Verifica a genuinidade da requisição usando tokens, HMAC ou certificados.
    - `normalize`: Mapeia payloads estranhos num `NormalizedWebhookEvent` e determina status genéricos (`APPROVED`, `FAILED`, `REFUNDED`).
3. **Registry Pattern**: Implementamos registradores em tempo de boot (via Modulos NestJS) que cadastram os Processadores e Adaptadores suportados. A ausência de um adapter sinaliza erro semântico seguro de não-suporte.
4. **Idempotência Forte (Inbox Pattern)**: `provider + providerEventId` operam como chaves de unicidade. Eventos duplicados não produzem Side Effects nas transações financeiras, retornando HTTP 200 pro provedor para cessar retentativas deles.

Nesta Fase 7B, apenas o **ASAAS** encontra-se implementado e registrado no Processor. Os demais operam como "Stubs/Esqueletos". 

## Consequences

### Positivas
* Inclusão de um novo provedor será trivial: Cria-se as implementações das interfaces, expõe-se o Controller dele (ou reaproveita caso se consiga derivar na URL), e atualiza-se o Provider no Registry.
* Controllers podem ser tão burros a ponto de focar apenas em rotear HTTP Request pro Service.
* Segurança é encapsulada em cada Adapter, e validações de HMAC que demandam *Raw Body Buffer* serão isoladas neles.

### Negativas / Riscos
* Incremento de abstrações pode elevar o tempo de onboard em manutenções simples de webhook.
* Faltou a integração com um Message Broker (RabbitMQ). Quando as integrações Outbox ganharem este suporte, teremos de refatorar o Registry de Webhook para processar o evento através da Fila, convertendo o processamento num Worker de background de forma integral. Isto está planejado para uma fase subsequente.
