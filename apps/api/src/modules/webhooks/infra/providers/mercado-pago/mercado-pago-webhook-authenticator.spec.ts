import * as crypto from 'crypto';
import { WebhookAuthenticationError } from '../../../domain/errors/webhook-errors';
import { MercadoPagoWebhookAuthenticator } from './mercado-pago-webhook-authenticator';

describe('MercadoPagoWebhookAuthenticator', () => {
  it('validates Mercado Pago x-signature when secret is configured', async () => {
    const secret = 'mp-secret';
    const timestamp = '1720000000';
    const requestId = 'request-1';
    const dataId = 'payment-1';
    const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
    const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    const authenticator = new MercadoPagoWebhookAuthenticator(
      config({ MERCADO_PAGO_WEBHOOK_SECRET: secret }),
    );

    await expect(
      authenticator.authenticate({
        headers: {
          'x-signature': `ts=${timestamp},v1=${digest}`,
          'x-request-id': requestId,
        },
        payload: { data: { id: dataId } },
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects missing secret in production', async () => {
    const authenticator = new MercadoPagoWebhookAuthenticator(config({ NODE_ENV: 'production' }));

    await expect(
      authenticator.authenticate({
        headers: {},
        payload: { data: { id: 'payment-1' } },
      }),
    ).rejects.toBeInstanceOf(WebhookAuthenticationError);
  });
});

function config(values: Record<string, string>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as never;
}
