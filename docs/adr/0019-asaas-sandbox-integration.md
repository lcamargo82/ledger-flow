# ADR 0019: Asaas Sandbox Integration

**Status:** Accepted
**Date:** 2026-06-19
**Context:** LedgerFlow Payments (Fase 6.1)

## Contexto
O LedgerFlow estabeleceu a **Multi-Gateway Abstraction Foundation (ADR 0018)**. O próximo passo lógico é validar essa abstração conectando um provedor real. O **Asaas** foi escolhido como o primeiro gateway real a ser integrado, especificamente no ambiente **Sandbox**, focando exclusivamente nos métodos de pagamento **PIX** e **BOLETO**.

## Decisão
Implementar o adapter de pagamento `AsaasPaymentGatewayAdapter` conectado ao orquestrador `GatewayPaymentOrchestrationService` seguindo as diretrizes de segurança estritas e isolamento:

1. **Sandbox Obrigatório:** O ambiente de produção está completamente fora de escopo. A Base URL do AsaasApiClient é forçosamente restrita a `https://sandbox.asaas.com/api/v3`.
2. **Isolamento de Credenciais:** As credenciais (como a API Key) não são lidas por interface pública, logs, ou repositório no Github. Elas são criptografadas (AES-256-GCM) durante o processo de configuração via script, e armazenadas de forma ininteligível no banco, sendo decriptadas apenas na memória no momento de repasse aos requests HTTP para o provedor.
3. **Mapeamento Local (Customer):** O Customer do LedgerFlow não deve ser duplicado a cada requisição. Empregamos a entidade `GatewayCustomerReference` para criar um elo forte de mapeamento entre o `customerId` local e o `providerCustomerId` (retornado pela API `/customers` do Asaas).
4. **Idempotência Externa:** Para evitar faturamento duplicado por conta de falhas de timeout, antes do adapter acionar o endpoint de POST do Asaas, ele realiza um GET checando `externalReference`. Caso uma cobrança já exista com aquela referência, a cobrança já existente será mapeada para a resposta local. A referência local principal (`Payment.reference`) é mapeada estritamente no campo `externalReference` do Asaas.
5. **Sem Polling e Fallback Gracioso:** Status atualizados via provedor no futuro deverão advir exclusivamente de **Webhooks (Fase 7)** e não via rotinas de Polling. Se uma cobrança externa falhar ou se o tenant não tiver as credenciais ativas, o sistema continuará processando a criação da representação interna (Pending) e gerará logs seguros de auditoria com a falha (providerSyncStatus = FAILED) sem quebrar o módulo interno.

## Consequências
- **Segurança Reforçada:** Ao proibir as credenciais em texto claro, impedimos que vazamentos do DB comprometam o acesso a gateways de terceiros.
- **Complexidade do Lifecycle:** Sincronização e retries dependem de mecanismos futuros (como filas assíncronas do RabbitMQ / Padrão Outbox). Por enquanto, as interrupções resultarão em falha no sync externo mantendo o estado local preservado.
- **Acoplamento Inexistente:** O `PaymentsService` que opera a lógica Core permanece agnóstico aos requisitos do Asaas. Todo roteamento foi desacoplado de forma declarativa e dinâmica através do `GatewayPaymentOrchestrationService`.
