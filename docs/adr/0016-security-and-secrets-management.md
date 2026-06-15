# ADR-0016 — Estratégia de Segurança, Gestão de Segredos e Proteção de Dados Sensíveis

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow é uma plataforma financeira B2B multitenant. O sistema manipula informações sensíveis relacionadas a:

* Usuários.
* Tenants.
* Clientes.
* Pagamentos.
* Webhooks.
* API Keys.
* Credenciais de gateways.
* Tokens de autenticação.
* Logs de auditoria.
* Payloads externos.
* Relatórios financeiros.

Mesmo sendo um projeto de estudo e portfólio, a arquitetura deve simular boas práticas reais de segurança utilizadas em sistemas corporativos.

Falhas de segurança nesse tipo de sistema podem causar:

* Vazamento de dados.
* Acesso indevido entre tenants.
* Exposição de credenciais.
* Uso indevido de API Keys.
* Fraude em webhooks.
* Reprocessamento malicioso de eventos.
* Alteração indevida de gateway de pagamento.
* Vazamento de informações em logs.
* Quebra de confiança do sistema.

---

## 2. Decisão

O LedgerFlow adotará uma estratégia de segurança baseada em:

* Princípio do menor privilégio.
* Criptografia de segredos.
* Hash para senhas, refresh tokens e API Keys.
* JWT com expiração curta.
* Refresh token seguro.
* RBAC e preparação para ABAC.
* Validação de assinatura de webhooks.
* Assinatura HMAC de webhooks outbound.
* Sanitização de logs.
* Proteção contra vazamento cross-tenant.
* Rate limiting.
* CORS restrito.
* Helmet no backend.
* Validação rigorosa de entradas.
* Auditoria para ações críticas.
* Gestão segura de variáveis de ambiente.

---

## 3. Classificação de Dados

## 3.1 Dados Públicos

Dados que podem ser exibidos sem risco relevante.

Exemplos:

```text
Nome público da aplicação
Versão da API
Health check básico
Documentação pública da API
```

---

## 3.2 Dados Internos

Dados que não são extremamente sensíveis, mas não devem ser expostos publicamente.

Exemplos:

```text
IDs internos
Configurações operacionais
Status de jobs
Status de filas
Métricas técnicas
```

---

## 3.3 Dados Sensíveis

Dados que exigem proteção forte.

Exemplos:

```text
E-mails de usuários
Documentos de clientes
Dados financeiros
Histórico de pagamentos
Payloads de gateways
Payloads de webhooks
Relatórios exportados
```

---

## 3.4 Segredos

Dados que nunca devem ser exibidos ou logados.

Exemplos:

```text
Senhas
Refresh tokens
JWT secrets
Stripe Secret Key
Stripe Webhook Secret
API Keys
Webhook secrets
Encryption keys
SMTP credentials
Tokens externos
```

---

## 4. Gestão de Segredos

## 4.1 Variáveis de Ambiente

Segredos devem ser fornecidos por variáveis de ambiente.

Exemplo:

```env
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
ENCRYPTION_KEY=change-me-32-bytes-key
STRIPE_SECRET_KEY=sk_test_change_me
STRIPE_WEBHOOK_SECRET=whsec_change_me
```

Regras:

* Nunca versionar `.env` real.
* Versionar apenas `.env.example`.
* Usar valores fictícios no `.env.example`.
* Documentar todas as variáveis.
* Validar variáveis obrigatórias no startup da aplicação.
* Falhar o boot se segredo essencial estiver ausente.

---

## 4.2 Criptografia de Credenciais Externas

Credenciais de gateways e integrações externas devem ser criptografadas antes de serem armazenadas.

Exemplos:

```text
Stripe Secret Key
Asaas API Key
Mercado Pago Access Token
Webhook secrets
SMTP credentials, se forem configuráveis por tenant futuramente
```

Algoritmo sugerido:

```text
AES-256-GCM
```

Regras:

* Chave de criptografia deve vir do ambiente.
* Não logar valores descriptografados.
* Descriptografar apenas no momento de uso.
* Registrar auditoria quando credencial for criada, alterada ou revogada.
* Exibir apenas valor mascarado no frontend.

---

## 4.3 Hash de Senhas

Senhas devem ser armazenadas com hash seguro.

Regras:

* Nunca armazenar senha em texto puro.
* Nunca logar senha.
* Aplicar salt.
* Validar força mínima.
* Proteger contra brute force com rate limiting.
* Fluxo de recuperação deve usar token com expiração.

---

## 4.4 Hash de Refresh Tokens

Refresh tokens devem ser armazenados com hash.

Regras:

* Nunca armazenar refresh token puro.
* Nunca logar refresh token.
* Logout deve invalidar token.
* Renovação deve permitir rotação.
* Reutilização suspeita deve ser auditada.

---

## 4.5 Hash de API Keys

API Keys devem ser exibidas apenas uma vez no momento da criação.

Regras:

* Armazenar apenas hash.
* Não permitir recuperação da API Key completa.
* Permitir revogação.
* Registrar último uso.
* Associar escopos.
* Associar tenant.
* Registrar auditoria de criação e revogação.

---

## 5. Segurança em Webhooks

## 5.1 Webhooks Inbound

Webhooks recebidos de gateways externos devem ser validados.

Exemplo com Stripe:

```text
Validar header stripe-signature usando raw body.
```

Regras:

* Rejeitar webhook sem assinatura.
* Rejeitar assinatura inválida.
* Salvar evento em Inbox.
* Garantir idempotência.
* Registrar tentativas inválidas.
* Não confiar apenas no payload recebido.

---

## 5.2 Webhooks Outbound

Webhooks enviados para clientes devem ser assinados.

Regras:

* Assinar payload com HMAC.
* Enviar timestamp.
* Enviar eventId.
* Permitir que cliente valide origem.
* Retentar falhas.
* Registrar tentativas.
* Não enviar segredos no payload.

Headers sugeridos:

```text
X-LedgerFlow-Event-Id
X-LedgerFlow-Timestamp
X-LedgerFlow-Signature
```

---

## 6. Proteção Multitenant

Regras obrigatórias:

* Toda entidade sensível deve possuir `tenantId`.
* Toda query crítica deve filtrar por `tenantId`.
* Frontend não deve definir `tenantId` de operações sensíveis.
* `tenantId` deve vir do contexto autenticado.
* API Key deve estar vinculada ao tenant.
* Webhook endpoint deve estar vinculado ao tenant.
* Exportação deve estar vinculada ao tenant.
* Notificação deve estar vinculada ao tenant.
* Testes devem provar isolamento cross-tenant.

---

## 7. Segurança de Logs

Nunca logar:

```text
Senhas
Tokens
Refresh tokens
API Keys completas
Secret keys
Encryption keys
Dados completos de cartão
CVV
Headers Authorization
Cookies sensíveis
Payloads sensíveis sem máscara
```

Logs devem conter apenas dados necessários para diagnóstico.

Campos úteis:

```json
{
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "userId": "user-id",
  "event": "PAYMENT_CREATED",
  "status": "success"
}
```

---

## 8. Segurança HTTP

O backend deve utilizar:

```text
Helmet
CORS restrito
Rate limiting
Body size limit
Validation pipes
DTO validation
Sanitização de inputs
Timeouts em chamadas externas
```

Regras:

* Não permitir origem pública indiscriminada em produção.
* Limitar tamanho de payload.
* Validar todos os DTOs.
* Não retornar stack trace.
* Não expor headers desnecessários.
* Aplicar rate limit em rotas sensíveis.

---

## 9. Segurança no Frontend

Regras:

* Não exibir secrets completas.
* Mascarar API Keys.
* Mascarar credenciais de gateway.
* Evitar `v-html`.
* Tratar erros sem stack trace.
* Não confiar no frontend para segurança real.
* Usar permissões apenas para UX.
* Backend sempre valida autorização.
* Aplicar timeout em requests.
* Limpar sessão no logout.

---

## 10. Alternativas Consideradas

## 10.1 Segurança mínima apenas para MVP

### Vantagens

* Mais rápido.
* Menos código.
* Menos complexidade.

### Desvantagens

* Não condiz com sistema financeiro.
* Reduz valor de portfólio.
* Aumenta risco de vazamento.
* Dificulta evolução futura.

---

## 10.2 Segurança corporativa desde a base

### Vantagens

* Mais realista.
* Melhor para portfólio.
* Menor refatoração futura.
* Melhor proteção de dados.
* Demonstra maturidade técnica.

### Desvantagens

* Mais trabalho inicial.
* Mais testes.
* Mais documentação.
* Mais disciplina no desenvolvimento.

---

## 11. Consequências

## 11.1 Positivas

* Melhor proteção de dados.
* Menor risco de vazamento de segredos.
* Melhor isolamento entre tenants.
* Maior maturidade arquitetural.
* Melhor rastreabilidade.
* Melhor percepção profissional do projeto.

## 11.2 Negativas

* Mais complexidade.
* Mais código de infraestrutura.
* Mais testes necessários.
* Mais cuidado com configuração local.
* Mais documentação para manter.

---

## 12. Critérios de Validação

Esta decisão será considerada correta se:

* Senhas forem armazenadas com hash.
* Refresh tokens forem armazenados com hash.
* API Keys forem armazenadas com hash.
* Credenciais externas forem criptografadas.
* Logs não exibirem segredos.
* Webhooks inbound validarem assinatura.
* Webhooks outbound forem assinados.
* CORS e Helmet estiverem configurados.
* Rate limit estiver ativo em rotas sensíveis.
* Testes provarem isolamento multitenant.
* `.env.example` não possuir segredos reais.

---

## 13. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto virar produto comercial.
* Clientes exigirem compliance formal.
* Houver necessidade de gestão avançada de segredos.
* Houver deploy em cloud.
* Houver exigência de auditoria externa.

Possíveis evoluções futuras:

* Vault.
* AWS Secrets Manager.
* GCP Secret Manager.
* Azure Key Vault.
* MFA.
* SSO.
* SAML.
* OIDC.
* WAF.
* Rotação automática de segredos.
* Row Level Security no PostgreSQL.

---

## Implementation Notes

Nesta fase inicial e em ambiente local/portfólio, o frontend utiliza `localStorage` para armazenar access tokens e refresh tokens por simplicidade. 
Em produção, deve-se avaliar obrigatoriamente a transição para armazenamento de tokens em cookies `HttpOnly`, `Secure` e `SameSite` para mitigar ataques XSS.
Além disso, ferramentas como Helmet, CORS rigoroso, Rate Limiting, RequestId/TraceId middlewares e sanitização profunda de logs já estão planejados no backlog futuro.

### Phase 3B
- A criação de usuários ("Create User") agora exige uma `temporaryPassword`. Essa senha é hasheada via bcrypt do mesmo modo que a senha principal. Em uma fase posterior, será implementado um fluxo que força a alteração dessa senha temporária no primeiro acesso.

### Phase 3C
- As configurações de Tenant (Tenant Settings) foram implementadas com proteção para expor e atualizar apenas configurações públicas seguras (nome, timezone), e não expõem campos estruturais ou identificadores (`slug`, `active` como readonly).
