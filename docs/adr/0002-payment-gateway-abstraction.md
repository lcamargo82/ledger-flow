# ADR-0002 — Abstração de Gateways de Pagamento com Strategy + Factory

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow precisa processar pagamentos para múltiplos tenants.

Cada tenant pode ter necessidades diferentes em relação ao provedor de pagamento. Alguns clientes podem utilizar Stripe, outros Asaas, outros Mercado Pago ou qualquer outro gateway futuro.

Embora o sistema comece com suporte ao **Stripe**, a regra de negócio central não deve ficar presa a esse provider.

Gateways de pagamento costumam ter diferenças em:

* Autenticação.
* Formato de payload.
* Status de pagamento.
* Tipos de pagamento suportados.
* Webhooks.
* Reembolsos.
* Assinaturas.
* Erros.
* Limites operacionais.
* Tempos de liquidação.
* Regras de sandbox e produção.

Se o core da aplicação depender diretamente do SDK do Stripe, futuras integrações com Asaas, Mercado Pago ou outro provider exigirão refatoração profunda.

---

## 2. Decisão

O LedgerFlow utilizará uma arquitetura baseada em **Strategy Pattern** e **Factory Pattern** para desacoplar o core da aplicação dos gateways de pagamento.

Será criada uma interface comum chamada `IPaymentGateway`.

Cada provider terá seu próprio adapter:

* `StripePaymentGateway`
* `AsaasPaymentGateway`
* `MercadoPagoPaymentGateway`

O sistema terá uma factory responsável por escolher o adapter correto com base na configuração do tenant.

---

## 3. Interface Principal

```typescript id="v2txd2"
export interface CreateGatewayCustomerInput {
  tenantId: string;
  name: string;
  email: string;
  document?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentInput {
  tenantId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface RefundPaymentInput {
  tenantId: string;
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface GatewayPaymentResponse {
  gateway: string;
  gatewayTransactionId: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  rawResponse: unknown;
}

export interface IPaymentGateway {
  createCustomer(input: CreateGatewayCustomerInput): Promise<unknown>;
  createPayment(input: CreatePaymentInput): Promise<GatewayPaymentResponse>;
  refundPayment(input: RefundPaymentInput): Promise<GatewayPaymentResponse>;
}
```

---

## 4. Factory de Gateways

```typescript id="qopy3x"
@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly stripeAdapter: StripePaymentGateway,
    private readonly asaasAdapter: AsaasPaymentGateway,
    private readonly mercadoPagoAdapter: MercadoPagoPaymentGateway
  ) {}

  getProvider(providerName: string): IPaymentGateway {
    switch (providerName.toLowerCase()) {
      case 'stripe':
        return this.stripeAdapter;
      case 'asaas':
        return this.asaasAdapter;
      case 'mercadopago':
        return this.mercadoPagoAdapter;
      default:
        throw new BadRequestException('Unsupported payment provider');
    }
  }
}
```

---

## 5. Regras da Decisão

1. O SDK do Stripe só pode ser usado dentro do adapter Stripe.
2. O core de pagamento deve depender da interface `IPaymentGateway`.
3. O provider ativo deve ser definido por tenant.
4. Credenciais de gateway devem ser criptografadas.
5. Payloads brutos devem ser salvos no MongoDB para auditoria.
6. Dados transacionais normalizados devem ser salvos no PostgreSQL.
7. Status externos devem ser convertidos para status internos.
8. Erros externos devem ser convertidos para erros amigáveis do catálogo interno.
9. Pagamentos antigos devem preservar o provider original.
10. Troca de provider deve exigir permissão e confirmação explícita.

---

## 6. Alternativas Consideradas

### 6.1 Integrar diretamente com Stripe no service de pagamento

#### Vantagens

* Mais rápido no início.
* Menos abstração.
* Menos arquivos.

#### Desvantagens

* Alto acoplamento.
* Dificuldade para adicionar novos gateways.
* Regras de negócio ficariam misturadas com detalhes do Stripe.
* Dificuldade para testar.
* Refatoração futura custosa.

### 6.2 Criar um microserviço separado apenas para pagamentos

#### Vantagens

* Isolamento forte.
* Escalabilidade independente.
* Poderia centralizar lógica de providers.

#### Desvantagens

* Complexidade inicial maior.
* Exige contratos entre serviços.
* Exige deploy separado.
* Exige observabilidade distribuída desde o início.
* Não é necessário para o MVP.

### 6.3 Strategy + Factory dentro do monólito modular

#### Vantagens

* Baixo acoplamento.
* Fácil adicionar providers.
* Testabilidade melhor.
* Mantém simplicidade operacional.
* Demonstra maturidade arquitetural.
* Permite migração futura para serviço separado.

#### Desvantagens

* Mais arquivos e contratos.
* Exige disciplina na modelagem.
* Pode haver limitações para normalizar providers muito diferentes.
* Nem todos os recursos de todos os gateways terão equivalência perfeita.

---

## 7. Consequências

### 7.1 Consequências Positivas

* O Stripe pode ser substituído ou complementado futuramente.
* Cada tenant pode ter provider diferente.
* A regra de negócio fica protegida de detalhes externos.
* Testes podem usar adapters fake.
* Erros são padronizados.
* Auditoria fica mais organizada.
* O projeto ganha valor de portfólio por demonstrar design extensível.

### 7.2 Consequências Negativas

* O desenvolvimento inicial é um pouco mais demorado.
* Será necessário criar mappers entre status externos e internos.
* Cada provider terá particularidades que podem não encaixar perfeitamente na interface.
* Algumas funcionalidades específicas podem exigir extensões por provider.

---

## 8. Modelo de Status Interno

O sistema usará status internos normalizados:

```text id="hn8t78"
PENDING
PROCESSING
PAID
FAILED
CANCELED
REFUNDED
PARTIALLY_REFUNDED
```

Cada adapter será responsável por converter os status externos para esses status internos.

Exemplo:

```typescript id="l7bc3t"
function mapStripeStatus(status: string): PaymentStatus {
  switch (status) {
    case 'requires_payment_method':
      return 'PENDING';
    case 'processing':
      return 'PROCESSING';
    case 'succeeded':
      return 'PAID';
    case 'canceled':
      return 'CANCELED';
    default:
      return 'FAILED';
  }
}
```

---

## 9. Segurança

As credenciais dos gateways devem seguir as seguintes regras:

* Nunca armazenar em texto puro.
* Criptografar usando AES-256-GCM.
* Nunca exibir secret completa no frontend.
* Nunca logar secret.
* Permitir rotação de credenciais.
* Registrar auditoria quando gateway for alterado.
* Exigir permissão `gateways:manage`.
* Exigir modal de confirmação no frontend.

---

## 10. Critérios de Validação

Esta decisão será considerada correta se:

* O Stripe funcionar como gateway inicial.
* O service de pagamento não importar SDK do Stripe.
* Um adapter fake puder ser usado em testes.
* Novo provider puder ser adicionado sem refatorar o core.
* Cada tenant puder ter provider próprio.
* Erros externos forem convertidos para erros internos.
* Payloads brutos forem auditados.
* Status forem normalizados corretamente.

---

## 11. Possível Revisão Futura

Esta decisão poderá ser revista se:

* Providers futuros tiverem diferenças grandes demais.
* O sistema exigir múltiplos providers simultâneos para o mesmo pagamento.
* Houver necessidade de roteamento inteligente entre gateways.
* O módulo de pagamentos precisar ser extraído para microserviço.
* O projeto se tornar comercial e exigir certificações específicas.

Possíveis evoluções futuras:

* Smart routing por taxa de aprovação.
* Fallback automático entre providers.
* Comparação de custo por provider.
* Split de pagamentos.
* Antifraude.
* Conciliação bancária avançada.
