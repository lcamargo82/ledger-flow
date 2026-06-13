# ADR-0005 — Modelo de Multitenancy com Isolamento por TenantId

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow é uma plataforma B2B. Isso significa que múltiplas empresas usarão a mesma aplicação.

Cada empresa é um **tenant**.

Cada tenant possui seus próprios:

* Usuários.
* Clientes.
* Pagamentos.
* Configurações de gateway.
* Webhooks.
* API Keys.
* Relatórios.
* Notificações.
* Logs de auditoria.
* Permissões.
* Credenciais externas.

O sistema precisa garantir que dados de uma empresa nunca sejam acessados por outra.

Esse isolamento é um dos requisitos mais importantes do projeto.

Existem diferentes formas de implementar multitenancy:

* Um banco por tenant.
* Um schema por tenant.
* Uma tabela compartilhada com `tenantId`.
* Uma combinação híbrida.

Para o LedgerFlow, o objetivo inicial é criar um sistema robusto, mas viável para estudo, portfólio e desenvolvimento local com Docker.

---

## 2. Decisão

O LedgerFlow utilizará o modelo de **banco compartilhado com isolamento lógico por `tenantId`**.

Todas as entidades sensíveis terão uma coluna `tenantId`.

Exemplos:

```text
payments.tenant_id
customers.tenant_id
users.tenant_id
webhook_endpoints.tenant_id
api_keys.tenant_id
export_jobs.tenant_id
notifications.tenant_id
payment_gateway_configs.tenant_id
```

O backend será responsável por garantir que todas as queries respeitem o tenant autenticado.

---

## 3. Regras Principais

1. Toda entidade de negócio deve possuir `tenantId`.
2. Toda query de leitura deve filtrar por `tenantId`.
3. Toda query de escrita deve validar `tenantId`.
4. O usuário autenticado deve carregar seu `tenantId`.
5. Controllers não devem receber `tenantId` livremente do frontend para operações sensíveis.
6. O `tenantId` deve vir do contexto autenticado.
7. Usuário de um tenant não pode acessar dados de outro tenant.
8. Logs devem registrar `tenantId` quando disponível.
9. Eventos RabbitMQ devem carregar `tenantId`.
10. Auditorias devem carregar `tenantId`.

---

## 4. Exemplo de Query Segura

```typescript
async findPaymentById(id: string, tenantId: string) {
  return this.prisma.payment.findFirst({
    where: {
      id,
      tenantId
    }
  });
}
```

A consulta acima evita que um usuário busque pagamento de outro tenant apenas alterando o ID.

---

## 5. Exemplo de Query Insegura

```typescript
async findPaymentById(id: string) {
  return this.prisma.payment.findUnique({
    where: {
      id
    }
  });
}
```

Esse padrão é proibido para entidades multitenant, pois permite vazamento cross-tenant caso um ID seja conhecido.

---

## 6. Alternativas Consideradas

## 6.1 Um banco por tenant

### Vantagens

* Isolamento forte.
* Facilidade para backup individual.
* Menor risco de vazamento por query incorreta.
* Possível customização por cliente.

### Desvantagens

* Complexidade operacional alta.
* Migrations mais difíceis.
* Custo maior.
* Mais difícil rodar localmente.
* Mais difícil para projeto de portfólio.
* Provisionamento complexo.

## 6.2 Um schema por tenant

### Vantagens

* Isolamento melhor que tabelas compartilhadas.
* Organização por cliente.
* Pode facilitar algumas operações.

### Desvantagens

* Migrations complexas.
* Mais difícil escalar muitos tenants.
* Mais difícil configurar Prisma.
* Mais complexidade operacional.

## 6.3 Banco compartilhado com `tenantId`

### Vantagens

* Simples de implementar.
* Mais fácil de rodar localmente.
* Mais adequado para MVP.
* Funciona bem com Prisma.
* Menor complexidade operacional.
* Fácil criar queries agregadas por tenant.
* Boa opção para portfólio.

### Desvantagens

* Isolamento depende de disciplina nas queries.
* Query sem `tenantId` pode causar vazamento.
* Exige testes rigorosos.
* Exige padrões de repository.
* Pode exigir particionamento no futuro em grande escala.

---

## 7. Consequências

## 7.1 Positivas

* Desenvolvimento inicial mais rápido.
* Ambiente local mais simples.
* Menos complexidade com migrations.
* Boa compatibilidade com Prisma.
* Fácil demonstrar multitenancy.
* Boa base para evoluir futuramente.

## 7.2 Negativas

* Risco de vazamento se uma query esquecer `tenantId`.
* Exige testes de isolamento.
* Exige revisão cuidadosa em repositories.
* Exige padronização forte.
* Em escala muito alta pode exigir particionamento ou outro modelo.

---

## 8. Estratégias de Mitigação

Para reduzir riscos, serão adotadas as seguintes estratégias:

## 8.1 Repository Pattern

Services não devem fazer queries diretamente.

Queries devem ficar em repositories, onde o `tenantId` será obrigatório.

## 8.2 Guards e Contexto Autenticado

O `tenantId` deve ser extraído do usuário autenticado.

Exemplo:

```typescript
const tenantId = currentUser.tenantId;
```

O frontend não deve decidir o `tenantId`.

## 8.3 Testes de Cross-Tenant

Devem existir testes garantindo que:

* Tenant A não lê dados do Tenant B.
* Tenant A não altera dados do Tenant B.
* Tenant A não exporta dados do Tenant B.
* Tenant A não recebe notificações do Tenant B.

## 8.4 Índices Compostos

Criar índices usando `tenantId` e campos de busca.

Exemplos:

```text
tenant_id + created_at
tenant_id + status
tenant_id + email
tenant_id + external_id
```

## 8.5 Auditoria

Ações críticas devem registrar:

* tenantId.
* userId.
* ação.
* entidade afetada.
* horário.
* traceId.

---

## 9. Exemplo de Entidade

```prisma
model Payment {
  id          String   @id @default(uuid())
  tenantId    String
  customerId  String
  amount      Int
  currency    String
  status      String
  provider    String
  externalId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
  @@index([tenantId, status])
  @@index([tenantId, externalId])
}
```

---

## 10. Segurança

O modelo de multitenancy deve seguir estas regras:

* Nunca confiar em `tenantId` enviado pelo frontend.
* Nunca retornar dados sem escopo de tenant.
* Nunca permitir que usuário comum altere seu próprio `tenantId`.
* API Keys devem estar associadas a um tenant.
* Webhooks devem estar associados a um tenant.
* Exportações devem estar associadas a um tenant.
* Eventos devem carregar `tenantId`.
* Logs devem conter `tenantId`, mas não dados sensíveis.

---

## 11. Critérios de Validação

Esta decisão será considerada correta se:

* Todas as entidades sensíveis tiverem `tenantId`.
* Todas as queries críticas filtrarem por `tenantId`.
* Testes provarem isolamento entre tenants.
* API Keys forem vinculadas ao tenant correto.
* Webhooks forem vinculados ao tenant correto.
* Exportações não vazarem dados entre tenants.
* Logs e auditoria registrarem tenant.
* Repositories exigirem tenant em operações sensíveis.

---

## 12. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto virar produto comercial real.
* Alguns tenants exigirem isolamento físico.
* Houver requisitos contratuais de banco dedicado.
* O volume de dados exigir particionamento.
* Clientes enterprise exigirem ambientes dedicados.

Possíveis evoluções futuras:

* Banco dedicado para tenants enterprise.
* Schema dedicado para tenants premium.
* Particionamento por tenant.
* Row Level Security no PostgreSQL.
* Sharding.
* Estratégia híbrida.
