import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { MercadoLivreOAuthController } from './mercado-livre-oauth.controller';

describe('MercadoLivreOAuthController', () => {
  it('protects Mercado Livre connect with channels manage permission and connect capability', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      MercadoLivreOAuthController.prototype,
      'connect',
    );

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, descriptor?.value)).toEqual([
      'channels:manage',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, descriptor?.value)).toEqual([
      CommerceCapabilities.ChannelsConnect,
    ]);
  });

  it('protects disconnect with channels manage permission and connect capability', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      MercadoLivreOAuthController.prototype,
      'disconnect',
    );

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, descriptor?.value)).toEqual([
      'channels:manage',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, descriptor?.value)).toEqual([
      CommerceCapabilities.ChannelsConnect,
    ]);
  });

  it('does not return code, state or tokens from callback', async () => {
    const service = {
      handleCallback: jest.fn().mockResolvedValue({
        integrationId: 'integration-1',
        status: 'ACTIVE',
      }),
    };
    const controller = new MercadoLivreOAuthController(service as never);

    const result = await controller.callback('auth-code', 'oauth-state');

    expect(result).toEqual({
      integrationId: 'integration-1',
      status: 'ACTIVE',
    });
    expect(JSON.stringify(result)).not.toContain('auth-code');
    expect(JSON.stringify(result)).not.toContain('oauth-state');
    expect(JSON.stringify(result)).not.toContain('token');
  });
});
