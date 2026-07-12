# Consumidor de outbound webhooks

O segredo retornado na criação ou rotação da subscription deve ser armazenado no cofre do consumidor. Ele não pode ser recuperado novamente pela API.

## Validação obrigatória

1. Preserve os bytes exatos do corpo recebido; não faça parse/stringify antes de validar.
2. Rejeite timestamps fora de uma janela de cinco minutos.
3. Calcule `HMAC-SHA256(secret, timestamp + '.' + rawBody)`.
4. Compare o resultado em tempo constante com `X-LedgerFlow-Signature`, removendo o prefixo `v1=`.
5. Persista `Idempotency-Key` antes dos efeitos externos e devolva sucesso para chaves já processadas.

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLedgerFlowWebhook({ rawBody, headers, secret, now = Date.now() }) {
  const timestamp = headers['x-ledgerflow-timestamp'];
  const received = headers['x-ledgerflow-signature']?.replace(/^v1=/, '');
  if (!timestamp || !received || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  const receivedBytes = Buffer.from(received, 'hex');
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}
```

No n8n, a validação deve ocorrer antes dos demais nodes. O Webhook/Code node precisa trabalhar com o corpo bruto; se o fluxo disponível converter o JSON antes da validação, coloque um receptor que preserve o raw body à frente do n8n.

## Vetor de teste

```text
secret    = secret-123
timestamp = 1725000000
rawBody   = {"id":"event-1","type":"notification.created"}
signature = v1=d5bc462c938d0ff4e121587c7e9383af1c9564e0ca2def7ba88cc86ea7e8a301
```

Headers enviados: `Content-Type`, `User-Agent`, `Idempotency-Key`, `X-LedgerFlow-Delivery-Id`, `X-LedgerFlow-Timestamp` e `X-LedgerFlow-Signature`.

O payload contém apenas o evento normalizado: `id`, `type`, `category`, `severity`, `occurredAt`, `source` e `data`. Tokens, segredo da subscription, payload bruto de provider e corpo da resposta externa nunca são incluídos.
