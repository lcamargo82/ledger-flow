# ADR-0001 — Estilo Arquitetural: Monólito Modular Microservices-Ready

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow é uma plataforma B2B multitenant para pagamentos, conciliação financeira, auditoria, webhooks, relatórios e observabilidade.

O sistema possui características comuns de ambientes corporativos complexos:

* Múltiplos domínios de negócio.
* Integração com gateways externos.
* Processamento assíncrono.
* Controle rígido de permissões.
* Auditoria.
* Exportação de relatórios pesados.
* Observabilidade.
* Multitenancy.
* Alto grau de segurança.

Uma possibilidade inicial seria desenvolver o sistema diretamente como um conjunto de microserviços independentes. Porém, como o projeto será desenvolvido inicialmente por uma única pessoa e também terá finalidade de estudo e portfólio, iniciar com microserviços adicionaria uma carga operacional elevada logo no começo.

Microserviços exigiriam, desde o início:

* Deploy separado por serviço.
* Observabilidade distribuída mais complexa.
* Comunicação entre serviços.
* Versionamento de contratos.
* Estratégias de resiliência mais rígidas.
* Maior complexidade no ambiente local.
* Maior custo cognitivo para evolução inicial.

Por outro lado, um monólito tradicional sem separação clara poderia gerar alto acoplamento e dificultar evolução futura.

---

## 2. Decisão

O LedgerFlow será desenvolvido inicialmente como um **Monólito Modular Microservices-Ready**, utilizando **NestJS** como framework principal do backend.

A aplicação será organizada em módulos de domínio bem definidos, com fronteiras claras entre regras de negócio, infraestrutura e apresentação.

Cada módulo deverá seguir princípios de **Clean Architecture**, separando:

* `domain`
* `application`
* `infra`
* `presentation`

Estrutura base sugerida:

```text id="shk3sj"
apps/api/src/
├── common/
├── config/
├── database/
├── modules/
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── payments/
│   ├── payment-gateways/
│   ├── webhooks/
│   ├── reports/
│   ├── notifications/
│   ├── emails/
│   └── audit/
└── workers/
```

Cada módulo deve evitar dependência direta de detalhes internos de outro módulo. Quando houver comunicação entre domínios, ela deve ocorrer preferencialmente por:

* Interfaces.
* Services públicos do módulo.
* Use cases.
* Eventos internos.
* Mensageria, quando aplicável.

---

## 3. Alternativas Consideradas

### 3.1 Microserviços desde o início

Essa abordagem foi considerada por simular melhor o ambiente de grandes empresas.

#### Vantagens

* Escalabilidade independente.
* Deploy independente.
* Isolamento de falhas por serviço.
* Separação forte entre domínios.

#### Desvantagens

* Complexidade operacional alta.
* Mais difícil de rodar localmente.
* Exige observabilidade distribuída desde o início.
* Exige contratos mais rígidos entre serviços.
* Pode atrasar a entrega do MVP.
* Pode desviar foco do objetivo principal do projeto.

### 3.2 Monólito tradicional

Essa abordagem permitiria desenvolvimento rápido.

#### Vantagens

* Simplicidade inicial.
* Menos arquivos e menos abstrações.
* Mais rápido para começar.

#### Desvantagens

* Alto risco de acoplamento.
* Difícil extração futura para microserviços.
* Menos aderente a boas práticas enterprise.
* Menor valor arquitetural para portfólio.

### 3.3 Monólito modular

Essa foi a abordagem escolhida.

#### Vantagens

* Equilíbrio entre simplicidade e maturidade.
* Facilita desenvolvimento individual.
* Permite rodar localmente com Docker Compose.
* Permite separação clara de domínios.
* Facilita extração futura para microserviços.
* Demonstra maturidade arquitetural.
* Reduz complexidade inicial.

#### Desvantagens

* Todos os módulos compartilham o mesmo deploy.
* Exige disciplina para manter fronteiras.
* Pode virar um monólito acoplado se os módulos forem mal organizados.
* Escalabilidade independente só virá em uma fase futura.

---

## 4. Consequências

### 4.1 Consequências Positivas

* O projeto poderá evoluir de forma incremental.
* O ambiente local será mais simples de manter.
* O backend poderá ser executado como uma única aplicação NestJS.
* A organização modular facilitará entendimento por recrutadores ou avaliadores técnicos.
* Será possível demonstrar conceitos enterprise sem complexidade operacional excessiva.
* O projeto poderá migrar módulos para microserviços no futuro, se necessário.

### 4.2 Consequências Negativas

* Uma falha grave no processo principal pode afetar toda a aplicação.
* Escalabilidade será inicialmente vertical ou por réplica da aplicação inteira.
* É necessário manter disciplina arquitetural para evitar dependências indevidas.
* O acoplamento precisa ser constantemente monitorado.

---

## 5. Regras Arquiteturais

Para que o monólito modular continue saudável, as seguintes regras devem ser seguidas:

1. Módulos não devem acessar diretamente repositories de outros módulos.
2. Regras de negócio não devem depender de frameworks externos.
3. SDKs externos não devem aparecer na camada de domínio.
4. Controllers não devem conter regra de negócio.
5. Services não devem executar queries complexas diretamente.
6. Queries devem ficar em repositories.
7. Integrações externas devem ficar em adapters.
8. Eventos entre domínios devem ser explícitos.
9. Toda entidade sensível deve respeitar `tenantId`.
10. Todo erro deve ser tratado pelo padrão global.

---

## 6. Critérios de Validação

Esta decisão será considerada correta se:

* O projeto conseguir entregar o MVP com baixa complexidade operacional.
* Os módulos permanecerem separados.
* O backend continuar fácil de rodar localmente.
* O sistema conseguir evoluir para filas, workers, webhooks e relatórios sem grande refatoração.
* Novos módulos puderem ser adicionados sem impactar diretamente os módulos existentes.
* A arquitetura for compreensível para avaliação técnica em portfólio.

---

## 7. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto passar a ter múltiplos times.
* Um módulo exigir escala muito diferente dos demais.
* Um domínio específico tiver ciclo de deploy independente.
* A complexidade do monólito começar a prejudicar manutenção.
* O sistema se tornar um produto comercial real com demanda de produção.

Módulos candidatos à extração futura:

* Payments Worker.
* Reports Worker.
* Webhook Dispatcher.
* Notification Service.
* Audit Service.
