# 18. Multi-Gateway Payment Architecture

Date: 2026-06-19

## Status
Accepted

## Context
A plataforma LedgerFlow precisa suportar múltiplos gateways de pagamento para fornecer flexibilidade e resiliência aos tenants. Nesta fase inicial (Fase 6.0), a exigência é construir uma abstração desacoplada de pagamento (Foundation) sem realizar chamadas de rede externas e mantendo os endpoints atuais do core de pagamentos funcionais.

## Decision
1. **Providers Planejados:** A fundação suportará de imediato Stripe, Asaas, Mercado Pago, PagBank e Pagar.me.
2. **Desacoplamento do Core:** `PaymentsService` permanecerá agnóstico ao provider. O provedor e o adaptador correto serão resolvidos dinamicamente por `PaymentGatewayResolverService` e `PaymentGatewayFactoryService`.
3. **Escopo por Tenant:** Cada `GatewayConfiguration` pertencerá a um tenant e possuirá um ambiente (SANDBOX, TEST, LIVE). 
4. **Criptografia Segura:** Credenciais serão criptografadas em repouso usando AES-256-GCM. As chaves de acesso não serão expostas nas chamadas de endpoint. O sistema não gravará texto plano das credenciais; apenas a versão criptografada (`encryptedCredentials`) e um `credentialsFingerprint` serão persistidos. O `GATEWAY_CREDENTIALS_ENCRYPTION_KEY` residirá estritamente nas variáveis de ambiente.
5. **Independência de Adapters:** Cada adapter implementará `IPaymentGateway` de forma isolada, definindo declarativamente suas capacidades (capabilities).
6. **Fallback Futuro:** O modelo `GatewayConfiguration` introduziu os campos `priority` e `healthStatus` para possibilitar estratégias de roteamento e fallback automático no futuro.
7. **Integração Real (Fase 6.0):** Nenhum provedor é chamado nesta fase; os adaptadores lançam um erro controlado de tipo `GatewayNotImplementedError`.

## Consequences
- O Core permanece independente e fácil de testar.
- A adição de novos gateways no futuro afetará minimamente ou em nada a lógica de `PaymentsService`.
- Requerimento estrito na gestão da variável `GATEWAY_CREDENTIALS_ENCRYPTION_KEY` para iniciar o serviço com suporte a gateways com segurança.
