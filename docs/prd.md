# Product Requirements Document — PRD

# LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

**Versão:** 1.0.0
**Status:** Consolidado para início de desenvolvimento
**Autor/Tech Lead:** Leandro Camargo Bahia
**Tipo:** Projeto de estudo, portfólio e simulação corporativa
**Stack principal:** NestJS, Vue 3, TypeScript, PostgreSQL, MongoDB, Redis, RabbitMQ, Prisma, Docker, OpenTelemetry, Prometheus, Grafana, Datadog, Tailwind CSS, Pinia, Heroicons

---

# 1. Visão Geral do Produto

O **LedgerFlow** é uma plataforma B2B multitenant para gestão de pagamentos, conciliação financeira, auditoria, exportação de relatórios e observabilidade operacional.

A aplicação simula um sistema real usado por empresas que precisam emitir cobranças, acompanhar pagamentos, integrar diferentes gateways financeiros, receber webhooks, exportar relatórios pesados, monitorar falhas e controlar permissões de forma rígida.

O sistema terá suporte inicial ao **Stripe**, mas será desenvolvido com arquitetura desacoplada para permitir integração futura com outros gateways, como **Asaas**, **Mercado Pago** ou qualquer outro provedor de pagamento.

---

# 2. Objetivo do Projeto

O objetivo principal é construir um sistema de portfólio com características reais de uma grande empresa, demonstrando domínio sobre:

* Arquitetura backend com NestJS.
* Frontend componentizado com Vue 3.
* TypeScript em toda a stack.
* Integração com gateways de pagamento.
* Multitenancy.
* Segurança.
* Controle rígido de permissões.
* Filas e processamento assíncrono.
* Observabilidade.
* Logs estruturados.
* Exportação de dados em larga escala.
* Integração com APIs externas.
* Documentação profissional.
* Docker e ambiente local reproduzível.
* Boas práticas corporativas de desenvolvimento.

---

# 3. Nome do Produto

## Nome escolhido

**LedgerFlow**

## Subtítulo

**Enterprise Payment, Reconciliation & Observability Platform**

## Justificativa

O nome comunica o núcleo do produto:

* **Ledger:** registro financeiro, contábil, transacional e auditável.
* **Flow:** fluxo de pagamentos, eventos, webhooks, filas e conciliação.

É um nome sério, com aparência corporativa, adequado para um projeto de portfólio e potencialmente comercializável.

---

# 4. Problema de Negócio

Empresas que recebem pagamentos por múltiplos canais enfrentam problemas como:

* Dependência forte de um único gateway.
* Dificuldade em migrar entre provedores.
* Falta de rastreabilidade de eventos financeiros.
* Falhas em webhooks sem retry adequado.
* Falta de auditoria confiável.
* Relatórios lentos ou que travam o servidor.
* Controle frágil de permissões.
* Falta de observabilidade.
* Dificuldade em identificar falhas de integração.
* Baixa qualidade na experiência do usuário em erros, avisos e confirmações.

O LedgerFlow resolve esses problemas simulando uma plataforma corporativa capaz de centralizar pagamentos, conciliação, notificações, auditoria e monitoramento.

---

# 5. Objetivos de Negócio

## OBJ01 — Plataforma multitenant

Permitir que múltiplas empresas utilizem o sistema com dados totalmente isolados.

## OBJ02 — Gateway de pagamento desacoplado

Permitir que cada tenant utilize um gateway diferente, com Stripe como implementação inicial.

## OBJ03 — Auditoria e rastreabilidade

Registrar todas as ações críticas, eventos externos, webhooks, mudanças de status e respostas de APIs externas.

## OBJ04 — Alta confiabilidade

Utilizar filas, idempotência, retry, Dead Letter Queue, Outbox Pattern e Inbox Pattern.

## OBJ05 — Segurança corporativa

Implementar autenticação, RBAC, ABAC, criptografia de credenciais, validação de webhooks e proteção contra acessos indevidos.

## OBJ06 — Observabilidade

Monitorar logs, traces, métricas técnicas, métricas de negócio, filas, APIs, erros e performance.

## OBJ07 — Frontend profissional

Criar uma interface componentizada, responsiva, reutilizável, traduzível e performática.

## OBJ08 — Relatórios escaláveis

Permitir exportações CSV e XLSX pesadas sem estourar memória do servidor.

---

# 6. Personas

## 6.1 Owner

Usuário dono da empresa/tenant.

Permissões:

* Gerenciar empresa.
* Gerenciar usuários.
* Gerenciar permissões.
* Configurar gateways.
* Criar e revogar API Keys.
* Visualizar relatórios.
* Criar cobranças.
* Solicitar reembolsos.
* Configurar webhooks.
* Exportar dados.

## 6.2 Finance Operator

Usuário financeiro operacional.

Permissões:

* Criar cobranças.
* Visualizar pagamentos.
* Solicitar reembolsos, se permitido.
* Exportar relatórios financeiros.
* Visualizar dashboard financeiro.
* Acompanhar status de pagamentos.

Restrições:

* Não pode visualizar chaves secretas.
* Não pode alterar gateway.
* Não pode gerenciar usuários.

## 6.3 Support Viewer

Usuário de suporte ou auditoria.

Permissões:

* Visualizar clientes.
* Visualizar pagamentos.
* Visualizar logs e histórico.
* Visualizar webhooks.

Restrições:

* Não pode criar, editar ou excluir dados críticos.
* Não pode executar ações financeiras.

## 6.4 Developer

Usuário técnico do tenant.

Permissões:

* Criar e revogar API Keys.
* Configurar webhooks.
* Visualizar logs de webhooks.
* Testar integração em sandbox.
* Consultar documentação da API.

Restrições:

* Não pode acessar relatórios financeiros completos, salvo permissão adicional.
* Não pode executar ações financeiras administrativas.

---

# 7. Escopo Funcional

# RF01 — Autenticação

O sistema deve permitir autenticação segura usando JWT.

## Requisitos

* Login com e-mail e senha.
* Access Token com expiração curta.
* Refresh Token seguro.
* Logout com invalidação de sessão.
* Hash seguro de senhas.
* Hash de refresh tokens.
* Proteção contra brute force.
* Rate limit no login.
* Registro de tentativas de login.
* Recuperação de senha.
* Envio de e-mail para recuperação de senha.

## Critérios de aceite

* Usuário autenticado deve acessar rotas protegidas.
* Usuário não autenticado deve receber erro amigável.
* Token expirado deve bloquear acesso.
* Refresh token válido deve gerar novo access token.
* Logout deve invalidar a sessão.
* Tentativas excessivas de login devem ser bloqueadas temporariamente.

---

# RF02 — Multitenancy

O sistema deve isolar os dados de cada empresa.

## Requisitos

* Toda entidade sensível deve possuir `tenantId`.
* Usuários só podem acessar dados do próprio tenant.
* Consultas devem ser filtradas por `tenantId`.
* A API deve impedir acesso cross-tenant.
* Logs devem registrar o tenant relacionado.

## Critérios de aceite

* Usuário de um tenant não pode visualizar dados de outro.
* Usuário de um tenant não pode alterar dados de outro.
* Todas as queries principais devem considerar `tenantId`.
* Tentativa de acesso indevido deve gerar erro `FORBIDDEN`.

---

# RF03 — Controle de Permissões Rígido

O sistema deve implementar RBAC e preparar suporte a ABAC.

## Requisitos

* Roles.
* Permissions.
* Guards no NestJS.
* Menu frontend baseado em permissões.
* Botões críticos condicionados por permissão.
* Validação backend obrigatória.
* Frontend não deve ser fonte de segurança.

## Roles iniciais

* Owner.
* Finance Operator.
* Support Viewer.
* Developer.

## Exemplos de permissões

* `payments:create`
* `payments:read`
* `payments:refund`
* `customers:create`
* `customers:read`
* `reports:export`
* `webhooks:manage`
* `api-keys:manage`
* `users:manage`
* `gateways:manage`

## Critérios de aceite

* Usuário sem permissão não deve executar ação protegida.
* Menu deve esconder opções não autorizadas.
* Backend deve bloquear qualquer ação indevida mesmo se chamada diretamente por API.
* Erros de permissão devem ser amigáveis.

---

# RF04 — Gestão de Clientes

O sistema deve permitir cadastro e consulta de clientes pagadores.

## Requisitos

* Criar cliente.
* Editar cliente.
* Listar clientes com paginação backend.
* Buscar por nome, e-mail ou documento.
* Visualizar detalhes do cliente.
* Relacionar cliente a cobranças.
* Registrar auditoria de alterações.

## Critérios de aceite

* Clientes devem ser isolados por tenant.
* Listagens devem usar paginação backend.
* Campos inválidos devem retornar erro amigável.
* Alterações devem gerar logs de auditoria.

---

# RF05 — Gestão de Cobranças e Pagamentos

O sistema deve permitir criação, listagem e acompanhamento de pagamentos.

## Requisitos

* Criar cobrança.
* Selecionar método de pagamento.
* Suportar cartão, boleto e Pix como modelo de domínio.
* Processar cobrança pelo gateway configurado.
* Persistir status interno.
* Persistir ID externo do gateway.
* Salvar payload bruto em MongoDB.
* Registrar histórico de eventos.
* Permitir reembolso quando suportado.
* Garantir idempotência na criação de cobranças.

## Status internos

* `PENDING`
* `PROCESSING`
* `PAID`
* `FAILED`
* `CANCELED`
* `REFUNDED`
* `PARTIALLY_REFUNDED`

## Critérios de aceite

* Sistema deve criar cobrança no Stripe inicialmente.
* Core da aplicação não pode depender diretamente do SDK do Stripe.
* Cobrança deve registrar provider utilizado.
* Pagamento duplicado com mesma chave idempotente não deve criar nova cobrança.
* Erros do gateway devem ser convertidos para mensagens amigáveis.
* Payload bruto deve ser auditado.

---

# RF06 — Abstração de Gateways de Pagamento

O sistema deve usar arquitetura desacoplada para gateways.

## Requisitos

* Criar interface padrão de gateway.
* Criar adapter para Stripe.
* Preparar adapters para Asaas e Mercado Pago.
* Criar factory para seleção dinâmica.
* Permitir gateway por tenant.
* Criptografar credenciais do gateway.
* Normalizar status externos.
* Preservar particularidades de cada provider dentro do adapter.

## Providers planejados

* Stripe.
* Asaas.
* Mercado Pago.

## Critérios de aceite

* Stripe deve funcionar como provider inicial.
* Novo provider deve poder ser adicionado sem alterar a regra de negócio central.
* Cada tenant deve poder possuir provider próprio.
* Pagamentos antigos devem preservar o provider original.
* Credenciais sensíveis devem ser criptografadas.

---

# RF07 — Webhooks Inbound

O sistema deve receber eventos externos dos gateways de pagamento.

## Requisitos

* Criar endpoint para webhook do Stripe.
* Validar assinatura do Stripe.
* Rejeitar webhook sem assinatura.
* Rejeitar webhook inválido.
* Salvar payload bruto.
* Implementar Inbox Pattern.
* Garantir idempotência.
* Processar eventos relevantes.
* Registrar falhas para reprocessamento.

## Eventos iniciais

* `payment_intent.succeeded`
* `payment_intent.payment_failed`
* `charge.refunded`
* `customer.subscription.created`
* `customer.subscription.deleted`

## Critérios de aceite

* Webhook inválido deve ser rejeitado.
* Webhook duplicado não deve processar duas vezes.
* Evento válido deve atualizar status do pagamento.
* Falhas devem ser auditadas.
* Toda execução deve conter `traceId`.

---

# RF08 — Webhooks Outbound para Clientes

O sistema deve notificar sistemas externos dos clientes.

## Requisitos

* Tenant pode cadastrar endpoint de webhook.
* Sistema deve enviar eventos para o endpoint.
* Payload deve ser assinado com HMAC.
* Envio deve ocorrer via fila.
* Falhas devem gerar retry.
* Falhas definitivas devem ir para DLQ.
* Histórico de tentativas deve ser exibido.
* Developer pode reprocessar webhook.

## Eventos enviados

* `payment.created`
* `payment.approved`
* `payment.failed`
* `payment.refunded`
* `subscription.created`
* `subscription.canceled`
* `report.ready`

## Critérios de aceite

* Webhook deve ser enviado com assinatura.
* Cada tentativa deve registrar status code e resposta.
* Falhas devem ser retentadas.
* Falha definitiva deve aparecer no painel.
* Reprocessamento deve exigir permissão.

---

# RF09 — Filas e Processamento Assíncrono

O sistema deve usar RabbitMQ para tarefas assíncronas.

## Requisitos

* Fila de processamento de pagamentos.
* Fila de envio de e-mails.
* Fila de webhooks outbound.
* Fila de exportação de relatórios.
* Retry com backoff.
* Dead Letter Queue.
* Consumers resilientes.
* Logs estruturados dos consumers.

## Critérios de aceite

* Requisições HTTP não devem ficar bloqueadas por tarefas demoradas.
* Mensagens com falha devem ser retentadas.
* Mensagens com falha definitiva devem ir para DLQ.
* Workers não devem derrubar a aplicação em erro isolado.
* Filas devem ser documentadas.

---

# RF10 — Outbox Pattern

O sistema deve garantir consistência entre banco de dados e filas.

## Requisitos

* Criar tabela `outbox_events`.
* Salvar eventos dentro da mesma transação da operação principal.
* Worker deve publicar eventos pendentes.
* Eventos publicados devem ser marcados.
* Falhas devem ser retentadas.

## Critérios de aceite

* Evento não deve ser perdido se RabbitMQ estiver indisponível no momento da operação.
* Evento não deve ser publicado duplicado.
* Toda publicação deve ser auditável.

---

# RF11 — Inbox Pattern

O sistema deve garantir processamento seguro de eventos recebidos.

## Requisitos

* Criar tabela `inbox_events`.
* Salvar evento recebido antes do processamento.
* Verificar duplicidade.
* Validar assinatura.
* Registrar status de processamento.
* Permitir reprocessamento controlado.

## Critérios de aceite

* Evento duplicado deve ser ignorado com segurança.
* Evento inválido deve ser rejeitado.
* Falhas devem ser rastreáveis.
* Reprocessamento deve exigir permissão.

---

# RF12 — Relatórios e Exportações Pesadas

O sistema deve permitir exportação de dados financeiros.

## Requisitos

* Exportação CSV.
* Exportação XLSX.
* Uso de Node.js Streams para CSV.
* Uso de ExcelJS em modo streaming para XLSX.
* Exportações grandes devem ser assíncronas.
* Usuário deve receber notificação quando pronto.
* Arquivos devem ter expiração.
* Exportação deve respeitar tenant e permissões.

## Critérios de aceite

* Exportação pequena pode ser síncrona.
* Exportação grande deve ser assíncrona.
* Processo não deve carregar todos os registros em memória.
* Usuário deve visualizar status.
* Usuário deve baixar arquivo pronto.
* Arquivos expirados devem ser removidos.

---

# RF13 — E-mails Transacionais

O sistema deve enviar e-mails de forma desacoplada e assíncrona.

## Requisitos

* Criar módulo de e-mails.
* Criar interface de provider.
* Implementar SMTP local com Mailpit.
* Preparar adapters para SendGrid, Resend ou AWS SES.
* Enviar e-mails via fila.
* Templates devem suportar i18n.
* Não enviar dados sensíveis por e-mail.

## Eventos com e-mail

* Cadastro criado.
* Recuperação de senha.
* Pagamento aprovado.
* Pagamento recusado.
* Relatório pronto.
* Falha definitiva em webhook.
* Nova API Key criada.
* Gateway alterado.

## Critérios de aceite

* E-mail deve ser enviado via fila.
* Mailpit deve receber e-mails no ambiente local.
* Template deve respeitar idioma do usuário.
* Falhas devem gerar retry.
* Dados sensíveis não devem aparecer no conteúdo.

---

# RF14 — Notificações In-App e Toasts

O sistema deve fornecer feedback visual consistente.

## Requisitos

* Toast de sucesso.
* Toast de erro.
* Toast de warning.
* Toast informativo.
* Toast de loading.
* Notificações in-app.
* Histórico de notificações.
* Marcar notificação como lida.
* WebSocket para eventos críticos.

## Critérios de aceite

* Ações bem-sucedidas devem exibir feedback.
* Erros devem exibir mensagem amigável.
* Notificações críticas devem aparecer no painel.
* Usuário deve conseguir marcar notificações como lidas.

---

# RF15 — Modais de Confirmação

O sistema deve exigir confirmação para ações críticas.

## Ações que exigem modal

* Reembolsar pagamento.
* Cancelar assinatura.
* Excluir usuário.
* Revogar API Key.
* Alterar gateway.
* Reprocessar webhook.
* Solicitar exportação pesada.
* Desativar integração.

## Critérios de aceite

* Nenhuma ação crítica deve ser executada sem confirmação.
* Modal deve explicar consequência da ação.
* Botão de confirmação deve ser claro.
* Ação cancelada não deve alterar dados.

---

# RF16 — Tratamento Amigável de Erros

O sistema deve padronizar erros para o usuário final.

## Requisitos

* Criar catálogo central de erros.
* Toda API deve retornar código de erro.
* Toda resposta de erro deve conter `traceId`.
* Frontend deve traduzir erro baseado no código.
* Erros técnicos não devem aparecer ao usuário.
* Logs internos devem conter detalhes técnicos.

## Estrutura padrão

```json
{
  "code": "PAYMENT_GATEWAY_UNAVAILABLE",
  "message": "Não foi possível processar o pagamento neste momento.",
  "traceId": "01HZM9R7G2W6P",
  "statusCode": 503,
  "timestamp": "2026-06-12T18:30:00.000Z",
  "path": "/payments",
  "details": {
    "retryable": true
  }
}
```

## Critérios de aceite

* Todo erro deve seguir padrão único.
* Frontend deve exibir mensagem amigável.
* Logs devem preservar detalhes técnicos.
* `traceId` deve permitir rastrear o erro nos logs.

---

# RF17 — Internacionalização

O sistema deve suportar múltiplos idiomas.

## Idiomas iniciais

* Português do Brasil: `pt-BR`
* Inglês dos Estados Unidos: `en-US`
* Espanhol: `es-ES`

## Requisitos

* Traduções em arquivos JSON.
* Nenhuma string importante deve ficar hardcoded.
* Idioma deve ser armazenado no perfil ou localStorage.
* Frontend deve permitir troca de idioma.
* E-mails devem respeitar idioma.
* Mensagens de erro devem ser traduzíveis.

## Critérios de aceite

* Usuário deve trocar idioma.
* Interface deve atualizar traduções.
* Erros devem aparecer no idioma selecionado.
* E-mails devem usar template do idioma correto.

---

# RF18 — Timezones e Datas

O sistema deve tratar datas com rigor.

## Requisitos

* Banco deve armazenar datas em UTC.
* PostgreSQL deve usar `TIMESTAMPTZ`.
* Payloads devem trafegar em ISO 8601.
* Frontend deve exibir conforme timezone do usuário ou tenant.
* Relatórios devem informar timezone aplicado.
* Filtros de data devem considerar timezone.

## Critérios de aceite

* Datas devem ser persistidas em UTC.
* Usuário no Brasil deve visualizar horário em `America/Sao_Paulo`, quando configurado.
* Relatórios devem evitar ambiguidade de fuso.
* Filtros por período devem respeitar timezone selecionado.

---

# RF19 — Dashboard Financeiro

O sistema deve possuir dashboard financeiro.

## Métricas

* TPV.
* Total de pagamentos.
* Pagamentos aprovados.
* Pagamentos recusados.
* Taxa de aprovação.
* MRR.
* Churn.
* Volume por método de pagamento.
* Volume por provider.
* Webhooks com falha.
* Relatórios gerados.

## Critérios de aceite

* Dashboard deve consumir dados reais da API.
* KPIs devem respeitar tenant.
* Componentes devem ser reutilizáveis.
* Gráficos devem carregar somente quando renderizados.

---

# RF20 — Frontend Componentizado

O frontend deve ser fortemente componentizado.

## Requisitos

* Vue 3.
* TypeScript.
* Pinia.
* Tailwind.
* Heroicons.
* Vue Router com lazy loading.
* Services para API.
* Axios centralizado.
* Componentes reutilizáveis.
* Estilos globais centralizados.

## Componentes base

* `KpiCard`
* `DataTable`
* `Pagination`
* `FilterBar`
* `StatusBadge`
* `ConfirmModal`
* `ToastContainer`
* `EmptyState`
* `LoadingState`
* `ErrorState`
* `DashboardChart`
* `NotificationBell`
* `PermissionGuard`
* `PageHeader`
* `ActionMenu`

## Critérios de aceite

* Views não devem chamar Axios diretamente.
* Chamadas HTTP devem ficar em services.
* Componentes não usados não devem ser renderizados.
* Rotas devem usar lazy loading.
* Tabelas devem usar paginação backend.
* Estilos devem ser controlados por tokens globais.

---

# RF21 — APIs para Desenvolvedores

O sistema deve possuir área para desenvolvedores.

## Requisitos

* Criar API Keys.
* Revogar API Keys.
* Visualizar webhooks.
* Visualizar logs de entregas.
* Testar eventos.
* Consultar documentação.
* Visualizar exemplos de payload.

## Critérios de aceite

* Developer deve gerenciar API Keys.
* API Keys devem ser exibidas somente uma vez.
* API Keys devem ser armazenadas com hash.
* Webhooks devem ter histórico visível.
* Documentação deve estar acessível.

---

# RF22 — Documentação

O sistema deve possuir documentação profissional.

## Documentações obrigatórias

* README.
* PRD.
* SDD.
* Implementation Plan.
* ADRs.
* Swagger.
* Redoc.
* AsyncAPI.
* Diagramas C4.
* Diagrama de banco.
* Diagrama de filas.
* Runbooks.
* Collection Postman/Insomnia.

## Critérios de aceite

* Swagger deve documentar rotas HTTP.
* Redoc deve gerar referência legível.
* AsyncAPI deve documentar eventos e filas.
* README deve permitir rodar o projeto localmente.
* ADRs devem justificar decisões técnicas.

---

# 8. Requisitos Não Funcionais

# RNF01 — Segurança

## Requisitos

* Hash de senha.
* JWT com expiração curta.
* Refresh token seguro.
* Rate limiting.
* Helmet.
* CORS restrito.
* Validação de entrada.
* Sanitização.
* Proteção contra SQL Injection via Prisma.
* Proteção contra XSS no frontend.
* Criptografia de credenciais sensíveis.
* API Keys com hash.
* Webhooks assinados.
* Logs sem dados sensíveis.
* Princípio do menor privilégio.

---

# RNF02 — Privacidade e LGPD

## Requisitos

* Minimização de dados pessoais.
* Auditoria de acesso.
* Não logar dados sensíveis.
* Permitir anonimização futura.
* Separar dados operacionais de payloads brutos.
* Criptografar segredos.
* Definir retenção para logs e payloads.

---

# RNF03 — Performance

## Requisitos

* Paginação obrigatória.
* Limite padrão de 50 registros.
* Índices em campos críticos.
* Cache com Redis quando adequado.
* Exportações por stream.
* Processamento assíncrono.
* Lazy loading no frontend.
* Evitar renderização desnecessária.

---

# RNF04 — Observabilidade

## Requisitos

* Logs estruturados.
* TraceId por request.
* OpenTelemetry.
* Prometheus.
* Grafana.
* Datadog opcional.
* Métricas técnicas.
* Métricas de negócio.
* Dashboards.
* Alertas básicos.

---

# RNF05 — Resiliência

## Requisitos

* Retry.
* Backoff.
* DLQ.
* Idempotência.
* Circuit breaker para APIs externas.
* Timeouts.
* Tratamento de falhas externas.
* Workers resilientes.

---

# RNF06 — Governança de Dependências

## Requisitos

* Não utilizar bibliotecas abandonadas.
* Evitar dependências sem manutenção há mais de 12 meses.
* Executar auditoria de vulnerabilidades.
* Bloquear dependências com vulnerabilidades críticas.
* Usar Dependabot ou Renovate.
* Preferir bibliotecas maduras e ativas.
* Justificar dependências relevantes via ADR quando necessário.

---

# RNF07 — Manutenibilidade

## Requisitos

* Clean Architecture.
* Separação de domínio e infraestrutura.
* Repository Pattern.
* Services.
* Use cases.
* DTOs.
* Validações.
* Mappers.
* Testes.
* Documentação.
* Convenções de commit.

---

# RNF08 — Ambiente Local

## Requisitos

O projeto deve subir com Docker Compose contendo:

* API NestJS.
* Web Vue.
* PostgreSQL.
* MongoDB.
* Redis.
* RabbitMQ.
* Mailpit.
* Prometheus.
* Grafana.

---

# 9. Fora de Escopo Inicial

Os itens abaixo não fazem parte do MVP inicial, mas podem entrar em fases futuras:

* Gateway Asaas completo.
* Gateway Mercado Pago completo.
* Split de pagamento.
* Antifraude real.
* KYC/KYB real.
* Nota fiscal.
* Open Finance.
* App mobile.
* Deploy Kubernetes.
* Multi-region.
* Data warehouse.
* Machine learning para fraude.

---

# 10. Roadmap Resumido

## Fase 0

Fundação técnica, Docker, estrutura do projeto e documentação base.

## Fase 1

Autenticação, multitenancy e RBAC.

## Fase 2

Erros amigáveis, toasts, modais e i18n.

## Fase 3

Clientes, cobranças e Stripe Adapter.

## Fase 4

Webhooks Stripe, Inbox Pattern e idempotência.

## Fase 5

RabbitMQ, Outbox Pattern e processamento assíncrono.

## Fase 6

E-mails transacionais e notificações in-app.

## Fase 7

Relatórios, CSV/XLSX e streams.

## Fase 8

Dashboard financeiro e componentização avançada.

## Fase 9

Observabilidade, logs, métricas e dashboards.

## Fase 10

Webhooks outbound para clientes.

## Fase 11

Multi-gateway real.

## Fase 12

Testes, qualidade, segurança e carga.

## Fase 13

Documentação final e apresentação de portfólio.

---

# 11. Critérios de Sucesso do Produto

O projeto será considerado bem-sucedido quando:

* Rodar localmente com Docker Compose.
* Permitir autenticação segura.
* Isolar dados por tenant.
* Controlar permissões rigidamente.
* Criar cobranças via Stripe.
* Processar webhooks com segurança.
* Registrar auditoria em MongoDB.
* Usar PostgreSQL para dados transacionais.
* Usar Redis para cache, rate limit, lock e idempotência.
* Usar RabbitMQ para tarefas assíncronas.
* Exportar CSV/XLSX com streams.
* Enviar e-mails via fila.
* Exibir toasts e modais padronizados.
* Tratar erros amigavelmente.
* Suportar múltiplos idiomas.
* Possuir logs estruturados.
* Exibir métricas no Grafana.
* Possuir documentação Swagger, Redoc e AsyncAPI.
* Ter README forte para portfólio.
* Ter testes e evidências técnicas.
