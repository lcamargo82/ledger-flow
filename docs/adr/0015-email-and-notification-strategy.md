# ADR-0015 — Estratégia de E-mails Transacionais e Notificações In-App

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow precisa comunicar eventos importantes aos usuários.

Exemplos:

* Cadastro criado.
* Recuperação de senha.
* Pagamento aprovado.
* Pagamento recusado.
* Relatório pronto.
* Webhook falhou definitivamente.
* API Key criada.
* API Key revogada.
* Gateway alterado.
* Tentativa de ação sem permissão.
* Exportação falhou.
* Reembolso processado.

Essas comunicações podem ocorrer por:

* E-mail.
* Notificação in-app.
* Toast no frontend.
* WebSocket em tempo real.

Enviar e-mails diretamente dentro de uma request HTTP pode causar lentidão e falhas na experiência do usuário.

Além disso, o sistema deve ser capaz de trocar o provider de e-mail no futuro sem alterar regras de negócio centrais.

---

## 2. Decisão

O LedgerFlow terá uma arquitetura desacoplada para comunicação com usuários, baseada em:

* Módulo de e-mails.
* Interface `IEmailProvider`.
* SMTP local com Mailpit no ambiente de desenvolvimento.
* Adapters futuros para SendGrid, Resend ou AWS SES.
* Envio de e-mails via fila RabbitMQ.
* Templates por idioma.
* Notificações in-app persistidas no banco.
* WebSocket para eventos em tempo real.
* Toasts no frontend para feedback imediato.

---

## 3. Tipos de Comunicação

## 3.1 Toasts

Usados para feedback imediato da interface.

Exemplos:

* Cliente criado com sucesso.
* Cobrança criada.
* Erro ao salvar.
* Permissão negada.
* Exportação solicitada.

Tipos:

```text
success
error
warning
info
loading
```

---

## 3.2 Notificações In-App

Usadas para eventos relevantes que o usuário pode consultar depois.

Exemplos:

* Relatório pronto.
* Webhook falhou.
* Pagamento aprovado.
* Gateway alterado.
* API Key revogada.

Características:

* Persistidas no PostgreSQL.
* Associadas a tenant.
* Associadas a usuário, quando aplicável.
* Podem ser marcadas como lidas.
* Podem aparecer em tempo real via WebSocket.

---

## 3.3 E-mails Transacionais

Usados para eventos importantes mesmo quando o usuário está offline.

Exemplos:

* Recuperação de senha.
* Relatório pronto.
* Falha crítica de webhook.
* Alerta de segurança.
* Pagamento recusado, quando configurado.

---

## 4. Interface de Provider de E-mail

```typescript
export interface SendEmailInput {
  to: string;
  subject: string;
  template: string;
  locale: 'pt-BR' | 'en-US' | 'es-ES';
  variables: Record<string, unknown>;
}

export interface IEmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
```

---

## 5. Providers

Provider inicial:

```text
SMTP com Mailpit
```

Providers futuros:

```text
SendGrid
Resend
AWS SES
```

Regras:

* O domínio não deve depender de provider específico.
* Provider deve ser escolhido por configuração.
* Falhas devem gerar retry.
* E-mails devem ser enviados por fila.
* Templates devem respeitar idioma do usuário.

---

## 6. Fluxo de Envio de E-mail

```text
Use Case
  ↓
Cria evento email.send.requested
  ↓
Outbox
  ↓
RabbitMQ
  ↓
Email Consumer
  ↓
Renderiza template
  ↓
IEmailProvider
  ↓
SMTP/Mailpit ou provider externo
```

---

## 7. Templates

Templates devem ser organizados por idioma.

```text
modules/emails/templates/
├── pt-BR/
├── en-US/
└── es-ES/
```

Templates iniciais:

```text
welcome
password-reset
payment-approved
payment-failed
report-ready
webhook-failed
api-key-created
gateway-changed
```

Regras:

* Não usar dados sensíveis no template.
* Não enviar secret completa.
* Não enviar token diretamente em texto quando evitável.
* Links devem expirar quando aplicável.
* Assunto deve ser traduzido.
* Corpo deve ser traduzido.

---

## 8. Notificações In-App

Modelo sugerido:

```text
notifications
├── id
├── tenant_id
├── user_id
├── type
├── title
├── message
├── metadata
├── read_at
├── created_at
└── updated_at
```

Tipos iniciais:

```text
PAYMENT_APPROVED
PAYMENT_FAILED
REPORT_READY
WEBHOOK_FAILED
API_KEY_CREATED
GATEWAY_CHANGED
EXPORT_FAILED
```

---

## 9. WebSocket

WebSocket será usado para enviar notificações em tempo real.

Regras:

* Usuário deve estar autenticado.
* Conexão deve respeitar tenant.
* Usuário só deve receber eventos permitidos.
* Eventos sensíveis não devem expor dados desnecessários.
* Notificações devem ser persistidas antes ou junto do envio em tempo real.

---

## 10. Relação entre Toast, Notification e Email

Nem todo evento precisa de e-mail.
Nem todo evento precisa de notificação persistida.
Nem todo evento precisa de toast.

Exemplo:

| Evento                         |               Toast | In-App |   E-mail |
| ------------------------------ | ------------------: | -----: | -------: |
| Cliente criado                 |                 Sim |    Não |      Não |
| Pagamento aprovado             |            Opcional |    Sim | Opcional |
| Relatório pronto               |      Sim, se online |    Sim |      Sim |
| Webhook falhou definitivamente | Não necessariamente |    Sim |      Sim |
| API Key criada                 |                 Sim |    Sim |      Sim |
| Erro de formulário             |                 Sim |    Não |      Não |

---

## 11. Alternativas Consideradas

## 11.1 Enviar e-mail diretamente na request

### Vantagens

* Simples.
* Menos infraestrutura.
* Menos filas.

### Desvantagens

* Aumenta latência.
* Pode causar timeout.
* Falha de SMTP afeta UX.
* Difícil aplicar retry.
* Ruim para arquitetura enterprise.

---

## 11.2 Usar apenas toasts

### Vantagens

* Simples.
* Boa resposta visual imediata.
* Pouca infraestrutura.

### Desvantagens

* Usuário offline não recebe.
* Eventos importantes se perdem.
* Não há histórico.
* Não serve para recuperação de senha.
* Não serve para alertas críticos.

---

## 11.3 E-mail via fila + notificações in-app

### Vantagens

* Mais resiliente.
* Melhor experiência.
* Suporta usuário offline.
* Permite retry.
* Mantém histórico.
* Desacopla provider.
* Demonstra maturidade técnica.

### Desvantagens

* Mais módulos.
* Mais workers.
* Mais telas.
* Mais templates.
* Mais testes necessários.

---

## 12. Consequências

## 12.1 Positivas

* E-mails não travam requisições.
* Falhas podem ser retentadas.
* Usuário recebe alertas relevantes.
* Sistema mantém histórico.
* Provider pode ser trocado.
* Templates suportam múltiplos idiomas.
* Projeto ganha aparência mais corporativa.

## 12.2 Negativas

* Mais complexidade.
* Mais infraestrutura.
* Necessário gerenciar templates.
* Necessário evitar excesso de notificações.
* Necessário controlar preferências futuras.

---

## 13. Segurança

Regras:

* Não enviar senhas.
* Não enviar secrets completas.
* Não enviar API Keys completas, exceto no momento controlado de criação se necessário.
* Links de recuperação devem expirar.
* E-mails de segurança devem ser objetivos.
* Notificações devem respeitar tenant.
* Usuário não deve receber notificação de outro tenant.
* Logs de e-mail não devem conter conteúdo sensível.
* Templates devem mascarar dados sensíveis.

---

## 14. Observabilidade

Métricas recomendadas:

* E-mails solicitados.
* E-mails enviados.
* E-mails com falha.
* Tempo médio de envio.
* Retries de e-mail.
* Notificações criadas.
* Notificações lidas.
* Falhas de WebSocket.
* Eventos em tempo real enviados.

Logs devem conter:

```json
{
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "userId": "user-id",
  "eventType": "report.ready",
  "channel": "email",
  "status": "sent"
}
```

---

## 15. Critérios de Validação

Esta decisão será considerada correta se:

* E-mails forem enviados via fila.
* Mailpit receber e-mails localmente.
* Templates respeitarem idioma.
* Falhas gerarem retry.
* Provider for desacoplado por interface.
* Notificações forem persistidas.
* Usuário conseguir marcar notificação como lida.
* WebSocket entregar eventos críticos.
* Dados sensíveis não aparecerem em e-mails/logs.
* README documentar Mailpit e notificações.

---

## 16. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O produto exigir preferências de comunicação por usuário.
* O sistema exigir SMS.
* O sistema exigir WhatsApp.
* O sistema exigir push notification.
* O volume de e-mails crescer muito.
* O produto comercial exigir provider dedicado.

Possíveis evoluções futuras:

* Preferências de notificação.
* Digest diário.
* SMS.
* WhatsApp.
* Push notification.
* Templates editáveis por tenant.
* White-label de e-mails.
* Tracking de abertura.
