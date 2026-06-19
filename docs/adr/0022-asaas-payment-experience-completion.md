# 0022. Asaas Payment Experience Completion

Date: 2026-06-19

## Status

Accepted

## Context

Após a introdução da abstração Multi-Gateway (ADR-0018) e integração primária com Asaas Sandbox (ADR-0019), o LedgerFlow precisa fornecer uma experiência completa de pagamento na interface para o usuário final, especificamente a visualização das instruções de pagamento (PIX QR Code, PIX Copia e Cola, e links de Boleto). Além disso, o cancelamento de pagamentos pendentes/processando a partir do LedgerFlow precisa ser orquestrado com o gateway.

## Decision

Decidimos criar uma abstração focada em "Instruções de Pagamento" para permitir que a UI obtenha dados seguros (sem armazenar QR Codes pesados permanentemente no banco).

1.  **Novos campos no modelo `Payment`**:
    Foram adicionados os campos `providerInvoiceUrl`, `providerBankSlipUrl`, `providerPixCopyPaste`, `providerPixExpiresAt` e `providerPaymentUrl`. O QR Code base64 será sempre obtido sob demanda (on the fly) não sendo salvo no banco, respeitando o princípio de eficiência de storage.
2.  **Extensão do Gateway Orchestrator e IPaymentGateway**:
    Foi introduzido o método `getPaymentInstructions` e o DTO correspondente. Todos os adaptadores mock lançam exceções, exceto o AsaasAdapter, que implementa a lógica correta baseando-se no `method`.
3.  **Sincronismo de Cancelamento Seguro**:
    Ao invocar `cancelPayment` pela API, o Orchestrator primeiro consumirá a API do Asaas. Se a deleção falhar (ex: boleto já pago), o adapter levantará erro, impedindo o banco do LedgerFlow de alterar seu status para `CANCELED`, evitando a quebra de estado.

## Consequences

*   A UI de Detalhes do Pagamento no Vue agora possui a aba "Como Pagar" com atualização instantânea das credenciais (QRCode/Copia-Cola).
*   Storage mantido pequeno: não base64 blobs em banco SQL.
*   Maior consistência: O cancelamento só é efetivado localmente se a operação remota tiver sucesso.
