# ADR-0008 — Estratégia Global de Tratamento de Erros e Mensagens Amigáveis

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow possui múltiplos pontos de falha possíveis:

* Validação de entrada.
* Autenticação.
* Autorização.
* Permissões.
* Acesso cross-tenant.
* Gateway de pagamento indisponível.
* Webhook inválido.
* Falha em fila.
* Falha em banco.
* Falha em Redis.
* Falha em MongoDB.
* Falha em exportação.
* Falha em envio de e-mail.
* Erro inesperado.

Se cada módulo retornar erros de forma diferente, o frontend terá dificuldade para exibir mensagens amigáveis e o suporte terá dificuldade para investigar problemas.

Além disso, erros técnicos não devem ser exibidos ao usuário final.

Exemplo ruim:

```json
{
  "message": "Cannot read property 'id' of undefined"
}
```

Exemplo esperado:

```json
{
  "code": "PAYMENT_GATEWAY_UNAVAILABLE",
  "message": "Não foi possível processar o pagamento neste momento.",
  "traceId": "01HZM9R7G2W6P",
  "statusCode": 503,
  "timestamp": "2026-06-12T18:30:00.000Z",
  "path": "/payments"
}
```

---

## 2. Decisão

O LedgerFlow adotará uma estratégia global de tratamento de erros baseada em:

* Catálogo padronizado de códigos de erro.
* `GlobalExceptionFilter` no NestJS.
* `AppException` para erros de negócio.
* `traceId` obrigatório.
* Mensagens amigáveis para usuário final.
* Logs técnicos internos.
* Tradução de mensagens no frontend baseada no `code`.
* Toasts, modais e estados visuais padronizados.

---

## 3. Estrutura Padrão de Erro

```typescript
export interface ApiErrorResponse {
  code: string;
  message: string;
  traceId: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}
```

---

## 4. Exemplo de Resposta

```json
{
  "code": "FORBIDDEN",
  "message": "Você não tem permissão para executar esta ação.",
  "traceId": "01HZM9R7G2W6P",
  "statusCode": 403,
  "timestamp": "2026-06-12T18:30:00.000Z",
  "path": "/payments/123/refund"
}
```

---

## 5. Catálogo Inicial de Códigos

```typescript
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_GATEWAY_UNAVAILABLE = 'PAYMENT_GATEWAY_UNAVAILABLE',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_ALREADY_PROCESSED = 'WEBHOOK_ALREADY_PROCESSED',
  EXPORT_TOO_LARGE_SYNC = 'EXPORT_TOO_LARGE_SYNC',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EMAIL_DELIVERY_FAILED = 'EMAIL_DELIVERY_FAILED',
  REPORT_GENERATION_FAILED = 'REPORT_GENERATION_FAILED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}
```

---

## 6. Regras do Backend

1. Todo erro deve ser normalizado pelo `GlobalExceptionFilter`.
2. Erros inesperados não devem expor stack trace.
3. Erros de negócio devem usar `AppException`.
4. Erros externos devem ser convertidos para códigos internos.
5. Erros de validação devem indicar campos inválidos em `details`.
6. Toda resposta de erro deve conter `traceId`.
7. Erros devem ser logados internamente com detalhes técnicos.
8. Dados sensíveis não devem aparecer em logs.
9. O backend deve retornar uma mensagem padrão amigável.
10. O frontend pode substituir a mensagem com base no idioma.

---

## 7. Regras do Frontend

1. O frontend deve ler o `code`.
2. O frontend deve traduzir a mensagem com base nos arquivos JSON.
3. Caso o `code` não exista, deve exibir fallback genérico.
4. Erros devem ser exibidos por toast ou componente de erro.
5. Ações destrutivas devem usar modal.
6. Erros de formulário devem aparecer nos campos quando aplicável.
7. Erros globais devem aparecer como toast.
8. Erros de permissão devem explicar limitação ao usuário.
9. O frontend nunca deve exibir stack trace.
10. O `traceId` pode ser exibido em área técnica ou detalhe do erro.

---

## 8. Exemplo de Tradução

```json
{
  "errors": {
    "FORBIDDEN": "Você não tem permissão para executar esta ação.",
    "UNAUTHORIZED": "Sua sessão expirou. Faça login novamente.",
    "PAYMENT_GATEWAY_UNAVAILABLE": "Não foi possível processar o pagamento neste momento.",
    "INTERNAL_SERVER_ERROR": "Ocorreu um erro inesperado. Tente novamente."
  }
}
```

---

## 9. Alternativas Consideradas

## 9.1 Erros livres por módulo

### Vantagens

* Mais rápido no início.
* Menos estrutura.
* Menos código base.

### Desvantagens

* Inconsistência.
* UX ruim.
* Dificuldade de tradução.
* Difícil investigar erros.
* Não parece enterprise.

---

## 9.2 Retornar mensagens técnicas do backend

### Vantagens

* Mais fácil para debug inicial.
* Menos mapeamento.

### Desvantagens

* Inseguro.
* Confuso para usuário final.
* Pode expor detalhes internos.
* Pode vazar informações sensíveis.
* Não é adequado para produção.

---

## 9.3 Catálogo de erros + Exception Filter

### Vantagens

* Respostas consistentes.
* Melhor UX.
* Melhor suporte.
* Tradução facilitada.
* Rastreabilidade via `traceId`.
* Mais seguro.
* Melhor para portfólio.

### Desvantagens

* Mais estrutura inicial.
* Exige disciplina.
* Exige manter catálogo atualizado.
* Exige integração frontend/backend.

---

## 10. Consequências

## 10.1 Positivas

* Usuário vê mensagens amigáveis.
* Desenvolvedor consegue rastrear com `traceId`.
* Frontend fica mais simples e previsível.
* Erros podem ser traduzidos.
* Logs internos preservam detalhes técnicos.
* Segurança melhora.
* Sistema ganha aparência profissional.

## 10.2 Negativas

* Mais arquivos.
* Mais código base.
* Necessidade de manter códigos sincronizados.
* Possível duplicação entre backend e frontend se não houver organização.

---

## 11. Segurança

A estratégia de erros deve garantir:

* Não expor stack trace.
* Não expor secrets.
* Não expor tokens.
* Não expor detalhes internos do banco.
* Não expor queries.
* Não expor informações sensíveis de gateways.
* Não confirmar existência de dados sensíveis quando isso gerar risco.
* Não revelar se um recurso pertence a outro tenant.

Em casos cross-tenant, pode ser preferível retornar `NOT_FOUND` em vez de `FORBIDDEN`, dependendo do contexto, para evitar enumeração de recursos.

---

## 12. Observabilidade

Todo erro deve gerar log estruturado com:

```json
{
  "level": "error",
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "userId": "user-id",
  "code": "PAYMENT_GATEWAY_UNAVAILABLE",
  "path": "/payments",
  "method": "POST",
  "statusCode": 503,
  "message": "Stripe request timeout"
}
```

O usuário recebe uma mensagem amigável.
O log interno preserva informação suficiente para debug.

---

## 13. Critérios de Validação

Esta decisão será considerada correta se:

* Todos os erros seguirem o formato padrão.
* Todo erro retornar `traceId`.
* Stack trace não for retornado ao frontend.
* Frontend exibir mensagem amigável.
* Erros forem traduzíveis.
* Erros externos forem convertidos para códigos internos.
* Logs técnicos forem suficientes para debug.
* Dados sensíveis não aparecerem nos erros.

---

## 14. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto adotar geração automática de SDK.
* Backend e frontend passarem a compartilhar pacote comum de tipos.
* Houver necessidade de padrão RFC 7807 Problem Details.
* O sistema virar produto comercial e precisar de códigos públicos estáveis.

Possíveis evoluções futuras:

* Usar RFC 7807.
* Criar pacote compartilhado `@ledgerflow/contracts`.
* Criar documentação pública dos códigos de erro.
* Criar painel interno de erros por traceId.
