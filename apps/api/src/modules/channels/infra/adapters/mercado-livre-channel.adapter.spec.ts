import { ChannelProvider } from '@prisma/client';
import { MercadoLivreChannelAdapter } from './mercado-livre-channel.adapter';

describe('MercadoLivreChannelAdapter', () => {
  it('declares Mercado Livre provider metadata without owning inventory or orders repositories', () => {
    const adapter = new MercadoLivreChannelAdapter();

    expect(adapter.provider).toBe(ChannelProvider.MERCADO_LIVRE);
    expect(adapter.capabilities).toEqual({
      oauth: true,
      listingImport: true,
      webhooks: true,
      inventorySync: true,
      orderIntake: true,
    });
    expect(Object.keys(adapter)).not.toContain('inventoryRepository');
    expect(Object.keys(adapter)).not.toContain('ordersRepository');
  });
});
