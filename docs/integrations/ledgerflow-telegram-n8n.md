# LedgerFlow -> Telegram via n8n

Este pacote entrega um workflow importavel no n8n para receber outbound webhooks do LedgerFlow, validar HMAC, deduplicar por `Idempotency-Key` e enviar alerta no Telegram.

Arquivo de importacao:

```text
docs/integrations/ledgerflow-telegram-n8n.workflow.json
```

## O que voce vai precisar

- n8n publicado em HTTPS.
- Um bot do Telegram criado no `@BotFather`.
- O `chat_id` do destino no Telegram, que pode ser conversa privada, grupo ou canal.
- Um usuario LedgerFlow com JWT valido, permissao `notifications:manage` e capability `notifications.manage`.
- O segredo emitido pelo LedgerFlow ao criar a subscription. Ele aparece uma unica vez.

## Importar no n8n

1. No n8n, va em **Workflows > Import from File**.
2. Importe `docs/integrations/ledgerflow-telegram-n8n.workflow.json`.
3. Abra o node **Send Telegram Message** e selecione/crie a credencial **Telegram Bot API** com o token do `@BotFather`.
4. Crie as variables do n8n:
   - `LEDGERFLOW_WEBHOOK_SECRET`: segredo retornado pelo LedgerFlow ao criar a subscription.
   - `TELEGRAM_CHAT_ID`: id do chat/canal/grupo de destino.
5. Ative o workflow.
6. Copie a **Production URL** do node **LedgerFlow Webhook**.

O path configurado e:

```text
ledgerflow/telegram
```

Em producao, a URL fica no formato:

```text
https://SEU_N8N/webhook/ledgerflow/telegram
```

## Criar a subscription no LedgerFlow

Use a Production URL do n8n como `endpointUrl`.

```bash
curl -sS -X POST "$LEDGERFLOW_API_URL/notification-webhook-subscriptions" \
  -H "Authorization: Bearer $LEDGERFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Telegram",
    "endpointUrl": "https://SEU_N8N/webhook/ledgerflow/telegram",
    "eventTypes": [
      "sale.confirmed",
      "mercado_pago.payment_status_updated",
      "mercado_pago.connection_reauth_required",
      "marketplace_settlement.event_received",
      "cash_position.unexplained_difference",
      "channel.inventory_sync.failed",
      "reconciliation.case.divergent",
      "sale.loss_detected",
      "sale.low_margin_detected",
      "sale.missing_cost_detected",
      "sale.stock_not_consumed",
      "sale.shipping_delayed",
      "sale.settlement_divergent",
      "sale.cash_release_blocked"
    ]
  }'
```

Copie o campo `secret` da resposta e salve em `LEDGERFLOW_WEBHOOK_SECRET` no n8n.

## Testar a entrega

Depois de salvar o segredo no n8n, rode o teste tecnico do LedgerFlow:

```bash
curl -sS -X POST "$LEDGERFLOW_API_URL/notification-webhook-subscriptions/$SUBSCRIPTION_ID/test" \
  -H "Authorization: Bearer $LEDGERFLOW_TOKEN"
```

No n8n, a execucao deve responder `200`. No LedgerFlow, a delivery deve ficar `DELIVERED`.

## Como o workflow protege a automacao

- O Webhook do n8n usa `rawBody`, necessario porque o LedgerFlow assina `timestamp.rawBody`.
- O node Crypto calcula `HMAC-SHA256` usando `LEDGERFLOW_WEBHOOK_SECRET`.
- O node de validacao rejeita timestamp fora de 5 minutos.
- A deduplicacao usa `Idempotency-Key` antes de enviar Telegram.
- Duplicatas retornam `200` sem reenviar mensagem.
- Assinatura invalida retorna `401`, permitindo diagnostico no LedgerFlow.

## Chaves e segredos

Nunca salve no workflow JSON:

- `LEDGERFLOW_WEBHOOK_SECRET`
- token do bot Telegram
- JWT do LedgerFlow
- tokens OAuth Mercado Pago/Mercado Livre

Use variables/credentials do n8n. Se rotacionar o segredo no LedgerFlow, atualize `LEDGERFLOW_WEBHOOK_SECRET` imediatamente no n8n.
