# Runbook — Mercado Pago payment E2E

## Objetivo

Validar Mercado Pago como provedor operacional de pagamentos antes de ativar leituras financeiras/settlement.

Este runbook cobre conexão OAuth, criação PIX/boleto, webhook inbound, sincronização de status, notificações internas, outbound webhook/n8n, refresh token, desconexão e diagnóstico de reautorização.

## Pré-requisitos

- Ambiente HTTPS público apontando para a API LedgerFlow.
- App Mercado Pago configurado com o redirect:
  - `https://<api-host>/gateways/mercado-pago/oauth/callback`
- Webhook Mercado Pago configurado com a URL:
  - `https://<api-host>/webhooks/mercado-pago`
- Eventos Mercado Pago selecionados:
  - `Payments`/`payment`
  - se disponível no painel, manter apenas eventos de pagamento para este ciclo.
- Variáveis backend:
  - `MERCADO_PAGO_CLIENT_ID`
  - `MERCADO_PAGO_CLIENT_SECRET`
  - `MERCADO_PAGO_REDIRECT_URI`
  - `MERCADO_PAGO_WEBHOOK_SECRET`
  - `MERCADO_PAGO_TEST_MODE=true` em sandbox/teste
  - `NOTIFICATIONS_INTERNAL_PRODUCERS_ENABLED=true` quando for validar notificações
- Worker de outbox/webhooks ativo quando a validação incluir n8n.
- Consumidor n8n com dedupe por `Idempotency-Key` e validação HMAC conforme `docs/reference/notification-webhook-consumer.md`.

Nunca registre `access_token`, `refresh_token`, `Authorization`, `client_secret`, payload bruto do provider ou segredo de webhook em issue, print, log compartilhado ou evidência.

## Matriz de evidência

| Fluxo           | Evidência obrigatória                                                                  | Onde verificar                                                                           |
| --------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| OAuth           | configuração `MERCADO_PAGO` ativa e sem token exposto                                  | `GatewayConfiguration`, audit log `mercado_pago.oauth.connection_succeeded`, UI conexões |
| PIX create      | pagamento com `providerPaymentId`, instrução PIX e status inicial coerente             | `POST /payments`, `GET /payments/:id`, `GET /payments/:id/instructions`                  |
| Webhook inbound | inbox sanitizado recebido/duplicado sem payload bruto                                  | `WebhookInboxEvent`, logs `webhook.ingress.*`                                            |
| Status sync     | pagamento muda para status provider aprovado/rejeitado/cancelado/reembolsado permitido | `Payment`, `PaymentEvent`, `AuditLog`                                                    |
| Notificação     | evento interno autorizado criado uma vez                                               | `NotificationEvent` e feed/count                                                         |
| n8n outbound    | delivery assinado entregue uma vez ou deduplicado no consumidor                        | `NotificationWebhookDelivery`, headers HMAC, log do n8n                                  |
| Refresh         | token perto do vencimento renova sem expor segredo                                     | `lastHealthCheckMessage=MERCADO_PAGO_TOKEN_REFRESHED`, audit log                         |
| Reauth          | refresh inválido marca reconexão necessária                                            | status `REAUTH_REQUIRED`, notificação `mercado_pago.connection_reauth_required`          |
| Financial ready | conexão mostra se é payment-only ou settlement-ready                                   | `financialReadiness` em `GET /gateways/connections`, UI de conexões                      |
| Boleto          | boleto criado/status sincronizado ou limitação de provider documentada                 | pagamento boleto, instruções, nota de bloqueio                                           |

## 1. Conectar Mercado Pago

1. Acesse o painel LedgerFlow com usuário que tenha `gateways:create`.
2. Abra conexões de gateway e clique em conectar Mercado Pago.
3. Confirme que a autorização abre em nova aba/janela e retorna para:
   - `/settings/gateway-connections?success=true&provider=mercado-pago`
4. Confirme o status:

```bash
curl -sS "$API_URL/gateways/connections/mercado-pago/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Resultado esperado: `connected=true`, `provider=MERCADO_PAGO`, `status=ACTIVE`, métodos `PIX` e `BOLETO`.

Evidência segura:

- screenshot do status conectado sem tokens;
- audit log de conexão bem-sucedida;
- `GatewayConfiguration.credentialsFingerprint` presente;
- `financialReadiness.state` mostra `PAYMENT_ONLY` quando faltam escopos financeiros, ou `SETTLEMENT_READY` quando `offline_access` e `read` estão presentes e a conexão está saudável;
- ausência de token em response, UI, audit e logs.

## 2. Criar pagamento PIX

Crie um pagamento PIX com chave idempotente única:

```bash
curl -sS "$API_URL/payments" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: mp-pix-e2e-$(date +%Y%m%d%H%M%S)" \
  -d '{
    "customerId": "<customer-id>",
    "amount": 1000,
    "currency": "BRL",
    "method": "PIX",
    "provider": "MERCADO_PAGO",
    "description": "Mercado Pago PIX E2E"
  }'
```

Depois consulte instruções:

```bash
curl -sS "$API_URL/payments/<payment-id>/instructions" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Resultado esperado:

- `payment.provider=MERCADO_PAGO`;
- `providerPaymentId` armazenado internamente, mas não exposto em instruções públicas;
- `pixCopyPaste` ou QR retornado quando provider disponibilizar;
- status inicial `PENDING` ou equivalente.

## 3. Validar assinatura e inbox do webhook

No painel Mercado Pago, dispare o webhook real do pagamento ou conclua o pagamento em sandbox/teste quando disponível.

Para simular assinatura em ambiente controlado, gere `x-signature` com:

```text
manifest = id:<data.id>;request-id:<x-request-id>;ts:<ts>;
signature = HMAC-SHA256(MERCADO_PAGO_WEBHOOK_SECRET, manifest)
x-signature = ts=<ts>,v1=<signature>
```

Envio de exemplo, sem payload bruto sensível:

```bash
curl -sS "$API_URL/webhooks/mercado-pago" \
  -H "Content-Type: application/json" \
  -H "x-request-id: mp-e2e-request-1" \
  -H "x-signature: ts=$MP_TS,v1=$MP_SIGNATURE" \
  -d '{
    "id": "mp-e2e-event-1",
    "type": "payment",
    "action": "payment.updated",
    "data": { "id": "<provider-payment-id>" }
  }'
```

Resultado esperado:

- response `{ "received": true }`;
- `WebhookInboxEvent.status=RECEIVED` quando o pagamento for encontrado;
- segunda entrega do mesmo `providerEventId` não cria novo efeito;
- payload persistido apenas como hash/resumo sanitizado.

Validação automatizada relacionada:

```bash
npm test -- mercado-pago-webhook-authenticator.spec.ts webhook-ingress.service.spec.ts --runInBand
```

## 4. Processar status e notificação

Após o worker processar o inbox, consulte o pagamento:

```bash
curl -sS "$API_URL/payments/<payment-id>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Resultado esperado:

- status local segue o status normalizado Mercado Pago;
- estados terminais não regridem com webhooks antigos;
- `PaymentEvent` registra transição;
- `AuditLog` não contém token/payload bruto;
- se `NOTIFICATIONS_INTERNAL_PRODUCERS_ENABLED=true`, há evento `mercado_pago.payment_status_updated`.

Validação automatizada relacionada:

```bash
npm test -- payment-webhook-sync.service.spec.ts notification-event-registry.spec.ts --runInBand
```

## 5. Validar outbound webhook/n8n

Crie ou confirme uma subscription ativa para `mercado_pago.payment_status_updated`.

Durante a transição de status:

1. Confirme `NotificationWebhookDelivery` criada com `idempotencyKey=<subscription-id>:<event-id>`.
2. Confirme outbox `notification.webhook.delivery_requested`.
3. No n8n, valide:
   - `X-LedgerFlow-Timestamp`;
   - `X-LedgerFlow-Signature`;
   - `Idempotency-Key`;
   - payload normalizado, sem segredo/token/payload provider bruto.
4. Reentregue/replay a mesma delivery e confirme que o consumidor deduplica pelo `Idempotency-Key`.

Validação automatizada relacionada:

```bash
npm test -- notification-webhook-delivery-planner.service.spec.ts notification-webhook-delivery-requested.handler.spec.ts --runInBand
```

## 6. Validar refresh token

Em ambiente de staging, ajuste o token cifrado para expirar dentro da janela `MERCADO_PAGO_REFRESH_THRESHOLD_MS`, ou use uma conexão de teste próxima do vencimento.

Dispare uma operação que resolva credenciais:

- criar PIX;
- consultar instruções;
- processar webhook;
- cancelar/estornar pagamento elegível.

Resultado esperado:

- `GatewayConfiguration.healthStatus=HEALTHY`;
- `lastHealthCheckMessage=MERCADO_PAGO_TOKEN_REFRESHED`;
- audit log `mercado_pago.oauth.token_refreshed`;
- nenhum token em response, audit, inbox, notification ou log.

Validação automatizada relacionada:

```bash
npm test -- mercado-pago-credential.manager.spec.ts --runInBand
```

## 7. Validar reautorização necessária

Em staging, force refresh inválido apenas com credenciais de teste.

Resultado esperado:

- operação falha com mensagem operacional de reconexão;
- `GatewayConfiguration.status=REAUTH_REQUIRED`;
- `healthStatus=DEGRADED`;
- `lastHealthCheckMessage=MERCADO_PAGO_REAUTH_REQUIRED`;
- audit log `mercado_pago.connection_reauth_required`;
- notificação `mercado_pago.connection_reauth_required`;
- UI deve orientar o usuário a reconectar Mercado Pago.

## 8. Validar boleto

Crie pagamento com `method=BOLETO` e provider `MERCADO_PAGO`.

Resultado esperado quando o provider permitir no ambiente:

- pagamento criado com `providerPaymentId`;
- instruções retornam `bankSlipUrl`, `invoiceUrl` ou URL equivalente;
- webhook/fetch atualiza status sem regressão terminal.

Se o ambiente Mercado Pago não permitir boleto em sandbox/teste, registre a limitação na matriz de evidência com:

- data;
- ambiente;
- resposta sanitizada do provider sem token;
- decisão de go/no-go para boleto.

## Troubleshooting

| Sintoma                  | Diagnóstico                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| OAuth volta com erro     | conferir redirect URI exata, `MERCADO_PAGO_CLIENT_ID`, `MERCADO_PAGO_CLIENT_SECRET` e relógio do servidor       |
| `401` ao criar pagamento | conexão não ativa, token expirado sem refresh ou app sem escopo necessário                                      |
| Webhook `401`            | `MERCADO_PAGO_WEBHOOK_SECRET`, `x-signature`, `x-request-id` ou `data.id` inválidos                             |
| Inbox `UNMATCHED`        | `providerPaymentId`/`external_reference` não encontrou `Payment` local ou fingerprint do merchant ausente       |
| Notificação não aparece  | `NOTIFICATIONS_INTERNAL_PRODUCERS_ENABLED`, permissões/capabilities do usuário ou evento fora do registry       |
| n8n recebe duplicado     | consumidor precisa persistir `Idempotency-Key` antes dos efeitos externos                                       |
| Reauth recorrente        | refresh token revogado, app recriado, credenciais OAuth trocadas ou usuário revogou autorização no Mercado Pago |

## Critério de saída MP-5

- Runbook revisado e versionado.
- Pelo menos um PIX E2E real registrado na matriz de evidência.
- Boleto validado ou bloqueio do provider documentado.
- Assinatura webhook validada por teste automatizado e por evento real/simulado.
- Refresh validado por teste automatizado e por staging.
- n8n/outbound validado com dedupe.
- Screenshots/logs compartilháveis não expõem segredos.
