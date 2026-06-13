# ADR-0017 — Estratégia de Testes Automatizados, Qualidade e Validação de Segurança

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow simula uma plataforma financeira enterprise. O sistema terá fluxos críticos como:

* Login.
* Refresh token.
* Controle de permissões.
* Isolamento multitenant.
* Criação de pagamentos.
* Integração com Stripe.
* Webhooks.
* Idempotência.
* Outbox.
* Inbox.
* RabbitMQ.
* Exportações pesadas.
* E-mails.
* Relatórios.
* Auditoria.

Como esses fluxos envolvem dinheiro, permissões e dados sensíveis, testes automatizados são fundamentais para garantir confiabilidade.

Além disso, o projeto deve servir como portfólio técnico. Uma suíte de testes bem planejada demonstra maturidade profissional.

---

## 2. Decisão

O LedgerFlow adotará uma estratégia de testes em camadas:

* Testes unitários.
* Testes de integração.
* Testes end-to-end.
* Testes de componentes frontend.
* Testes de stores e services frontend.
* Testes de segurança.
* Testes de multitenancy.
* Testes de idempotência.
* Testes de webhooks.
* Testes de filas.
* Testes de exportação.
* Testes de carga com k6.

A cobertura total não precisa ser máxima no início, mas fluxos críticos devem ter prioridade.

---

## 3. Pirâmide de Testes

Estratégia inicial:

```text
Muitos testes unitários
Alguns testes de integração
Poucos testes E2E bem escolhidos
Testes de carga específicos
```

Objetivo:

* Testes rápidos para regra de negócio.
* Testes reais para integrações críticas.
* Testes E2E para fluxos principais.
* Testes de carga para demonstrar resiliência.

---

## 4. Testes Backend

## 4.1 Testes Unitários

Devem cobrir:

* Use cases.
* Services de aplicação.
* Guards.
* Mappers.
* Validações.
* Error handling.
* Estratégias de status de pagamento.
* Helpers de data/timezone.
* Helpers de criptografia.

Exemplos:

```text
PaymentService.createPayment
PermissionGuard
PaymentStatusMapper
GlobalExceptionFilter
TimezoneRangeHelper
```

---

## 4.2 Testes de Integração

Devem validar integração real com:

* PostgreSQL.
* Prisma.
* Redis.
* MongoDB.
* RabbitMQ.
* Repositories.
* Outbox.
* Inbox.

Preferencialmente usando containers ou ambiente Docker local.

---

## 4.3 Testes E2E

Fluxos prioritários:

```text
Criar tenant e owner
Login
Refresh token
Criar cliente
Criar pagamento
Receber webhook Stripe
Listar pagamentos
Exportar relatório
```

---

## 5. Testes de Segurança

Devem validar:

* Usuário sem token é bloqueado.
* Usuário sem permissão é bloqueado.
* Usuário de tenant A não acessa tenant B.
* API Key revogada não funciona.
* Refresh token inválido é rejeitado.
* Webhook com assinatura inválida é rejeitado.
* Payload duplicado não é processado duas vezes.
* Dados sensíveis não aparecem em respostas de erro.

---

## 6. Testes de Multitenancy

Cenários obrigatórios:

```text
Tenant A não lista clientes do Tenant B.
Tenant A não acessa pagamento do Tenant B.
Tenant A não exporta relatório do Tenant B.
Tenant A não vê notificações do Tenant B.
Tenant A não reprocessa webhook do Tenant B.
Tenant A não usa API Key do Tenant B.
```

Esses testes são prioridade alta.

---

## 7. Testes de Idempotência

Cenários:

```text
Mesma idempotency key não cria dois pagamentos.
Mesmo webhook Stripe não atualiza duas vezes.
Mesmo evento Outbox não publica duplicado.
Mesmo webhook outbound não é enviado sem controle.
```

---

## 8. Testes Frontend

## 8.1 Componentes

Componentes prioritários:

```text
Button
Input
DataTable
Pagination
ConfirmModal
ToastContainer
StatusBadge
PermissionGuard
LoadingState
ErrorState
EmptyState
```

---

## 8.2 Stores

Stores prioritárias:

```text
auth.store
locale.store
toast.store
modal.store
notification.store
permission.store
```

---

## 8.3 Services

Services devem ser testáveis com mock de HTTP.

Exemplos:

```text
auth.service
payment.service
customer.service
report.service
webhook.service
```

---

## 8.4 Rotas e Permissões

Testar:

* Usuário não autenticado redireciona para login.
* Usuário sem permissão não vê rota protegida.
* Menu respeita permissões.
* Botões críticos respeitam permissões.

---

## 9. Testes de Exportação

Devem validar:

* CSV pequeno.
* CSV grande via stream.
* XLSX via streaming.
* Exportação respeita tenant.
* Exportação respeita permissões.
* Arquivo expira.
* Job muda de status corretamente.
* Processo não carrega todos os registros em memória.

---

## 10. Testes de Webhooks

Devem validar:

* Webhook sem assinatura é rejeitado.
* Webhook com assinatura inválida é rejeitado.
* Webhook válido é salvo na Inbox.
* Webhook duplicado é ignorado.
* Webhook válido atualiza pagamento.
* Falha é registrada para reprocessamento.

---

## 11. Testes de Filas

Devem validar:

* Mensagem é publicada.
* Consumer processa mensagem.
* Erro gera retry.
* Falha definitiva vai para DLQ.
* TraceId é preservado.
* Consumer é idempotente.
* Outbox publica evento pendente.

---

## 12. Testes de Carga com k6

Cenários planejados:

```text
Login concorrente
Criação de pagamentos
Listagem paginada
Recebimento de webhooks
Exportação de relatório
Consulta de dashboard
```

Objetivos:

* Demonstrar comportamento sob carga.
* Gerar evidências para README.
* Validar métricas no Grafana.
* Avaliar latência e taxa de erro.

---

## 13. CI e Qualidade

O pipeline deve executar:

```text
Lint
Build
Testes unitários
Testes críticos
npm audit
CodeQL ou equivalente
Secret scanning
```

Vulnerabilidades high ou critical devem bloquear merge.

---

## 14. Estratégia Inicial de Cobertura

Prioridade por risco:

## P0

* Auth.
* RBAC.
* Multitenancy.
* Webhook signature.
* Idempotência.
* Payment creation.
* Error handling.

## P1

* Outbox.
* Inbox.
* RabbitMQ.
* Reports.
* Email.
* Notifications.

## P2

* Componentes frontend.
* Stores.
* k6.
* Observabilidade.

---

## 15. Alternativas Consideradas

## 15.1 Testar apenas manualmente

### Vantagens

* Mais rápido no curto prazo.
* Menos setup.
* Menos código.

### Desvantagens

* Alto risco de regressão.
* Ruim para segurança.
* Ruim para portfólio enterprise.
* Difícil validar multitenancy.
* Difícil validar idempotência.

---

## 15.2 Buscar cobertura alta desde o primeiro commit

### Vantagens

* Mais segurança.
* Melhor qualidade.
* Menos regressões.

### Desvantagens

* Pode atrasar MVP.
* Pode gerar testes frágeis cedo demais.
* Pode travar evolução inicial.

---

## 15.3 Testes por risco e criticidade

### Vantagens

* Equilíbrio.
* Foco nos pontos críticos.
* Bom para portfólio.
* Evita excesso de teste irrelevante.
* Mantém velocidade de entrega.

### Desvantagens

* Cobertura pode começar baixa em áreas menos críticas.
* Exige disciplina para aumentar testes com o tempo.
* Exige boa priorização.

---

## 16. Consequências

## 16.1 Positivas

* Menos regressões.
* Mais confiança em mudanças.
* Melhor segurança.
* Melhor demonstração técnica.
* Melhor manutenção.
* Melhor validação de regras financeiras.

## 16.2 Negativas

* Mais tempo de desenvolvimento.
* Mais setup.
* Mais manutenção.
* Testes podem quebrar com mudanças de contrato.
* Exige dados de teste bem planejados.

---

## 17. Critérios de Validação

Esta decisão será considerada correta se:

* Fluxos P0 tiverem testes.
* Multitenancy for testado.
* RBAC for testado.
* Webhooks forem testados.
* Idempotência for testada.
* Exportação pesada tiver teste ou evidência.
* CI executar lint, build e testes.
* npm audit bloquear vulnerabilidades graves.
* k6 existir para cenários principais.
* README apresentar evidências de testes.

---

## 18. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto crescer para múltiplos times.
* Houver necessidade de cobertura mínima obrigatória.
* O produto virar comercial.
* Houver exigência de compliance.
* Houver pipeline completo de deploy.

Possíveis evoluções futuras:

* Testcontainers.
* Playwright para E2E frontend.
* Mutation testing.
* Contract testing.
* Pact.
* Coverage gate.
* SonarQube.
* Testes visuais.
