import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../../../auth/presentation/decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { MercadoPagoOAuthController } from './mercado-pago-oauth.controller';

describe('MercadoPagoOAuthController', () => {
  it('keeps Mercado Pago connect protected by gateway creation permission', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      MercadoPagoOAuthController.prototype,
      'connect',
    );

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, descriptor?.value)).toEqual([
      'gateways:create',
    ]);
  });

  it('allows Mercado Pago to call the OAuth callback without a LedgerFlow JWT', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      MercadoPagoOAuthController.prototype,
      'callback',
    );

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, descriptor?.value)).toBe(true);
  });

  it('does not leak code, state or token values when redirecting after callback', async () => {
    const oauthService = {
      handleCallback: jest.fn().mockResolvedValue(undefined),
    };
    const gatewayConfigRepo = {};
    const controller = new MercadoPagoOAuthController(oauthService as never, gatewayConfigRepo as never);
    const redirect = jest.fn();

    await controller.callback('provider-code', 'oauth-state', { redirect } as never);

    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:5180/settings/gateway-connections?success=true&provider=mercado-pago',
    );
    expect(JSON.stringify(redirect.mock.calls)).not.toContain('provider-code');
    expect(JSON.stringify(redirect.mock.calls)).not.toContain('oauth-state');
    expect(JSON.stringify(redirect.mock.calls)).not.toContain('token');
  });
});
