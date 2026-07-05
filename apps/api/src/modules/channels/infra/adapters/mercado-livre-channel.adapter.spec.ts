import { ChannelProvider } from '@prisma/client';
import { MercadoLivreChannelAdapter } from './mercado-livre-channel.adapter';

describe('MercadoLivreChannelAdapter', () => {
  const apiClient = {
    searchSellerItems: jest.fn(),
    getItem: jest.fn(),
    getOrder: jest.fn(),
    updateItemStock: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares Mercado Livre provider metadata without owning inventory or orders repositories', () => {
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

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

  it('fetches Mercado Livre listings by pages and returns sanitized listing inputs', async () => {
    apiClient.searchSellerItems
      .mockResolvedValueOnce({
        results: ['MLB-1', 'MLB-2'],
        paging: { total: 3, offset: 0, limit: 2 },
      })
      .mockResolvedValueOnce({
        results: ['MLB-3'],
        paging: { total: 3, offset: 2, limit: 2 },
      });
    apiClient.getItem
      .mockResolvedValueOnce({
        id: 'MLB-1',
        title: 'Camiseta LedgerFlow Azul',
        seller_custom_field: 'CAMISETA-AZUL-M',
        status: 'active',
        secure_thumbnail: 'https://img.test/1.jpg',
        access_token: 'must-not-leak',
      })
      .mockResolvedValueOnce({
        id: 'MLB-2',
        title: 'Produto sem SKU',
        attributes: [{ id: 'SELLER_SKU', value_name: 'SKU-ATRIBUTO' }],
        status: 'paused',
      })
      .mockResolvedValueOnce({
        id: 'MLB-3',
        title: 'Produto final',
        seller_custom_field: 'SKU-FINAL',
        status: 'active',
      });
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const result = await adapter.fetchListings({
      accessToken: 'ml-access-token',
      externalAccountId: 'seller-1',
      maxPages: 2,
      pageSize: 2,
    });

    expect(apiClient.searchSellerItems).toHaveBeenNthCalledWith(1, {
      accessToken: 'ml-access-token',
      sellerId: 'seller-1',
      offset: 0,
      limit: 2,
    });
    expect(apiClient.searchSellerItems).toHaveBeenNthCalledWith(2, {
      accessToken: 'ml-access-token',
      sellerId: 'seller-1',
      offset: 2,
      limit: 2,
    });
    expect(result).toEqual([
      {
        externalListingId: 'MLB-1',
        title: 'Camiseta LedgerFlow Azul',
        externalSku: 'CAMISETA-AZUL-M',
        metadata: {
          providerStatus: 'active',
          thumbnailUrl: 'https://img.test/1.jpg',
        },
      },
      {
        externalListingId: 'MLB-2',
        title: 'Produto sem SKU',
        externalSku: 'SKU-ATRIBUTO',
        metadata: {
          providerStatus: 'paused',
        },
      },
      {
        externalListingId: 'MLB-3',
        title: 'Produto final',
        externalSku: 'SKU-FINAL',
        metadata: {
          providerStatus: 'active',
        },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('ml-access-token');
  });

  it('updates Mercado Livre listing stock using desired available quantity', async () => {
    apiClient.updateItemStock.mockResolvedValue({
      id: 'MLB-1',
      available_quantity: 7,
      access_token: 'must-not-leak',
    });
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const result = await adapter.updateListingStock({
      accessToken: 'ml-access-token',
      externalListingId: 'MLB-1',
      availableQuantity: 7,
    });

    expect(apiClient.updateItemStock).toHaveBeenCalledWith({
      accessToken: 'ml-access-token',
      externalListingId: 'MLB-1',
      availableQuantity: 7,
    });
    expect(result).toEqual({
      ok: true,
      providerStatus: 'updated',
      externalListingId: 'MLB-1',
      availableQuantity: 7,
    });
    expect(JSON.stringify(result)).not.toContain('ml-access-token');
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });

  it('normalizes optional Mercado Livre order financial components', async () => {
    apiClient.getOrder.mockResolvedValue({
      id: 2000000001,
      status: 'paid',
      currency_id: 'BRL',
      total_amount: 120.5,
      paid_amount: 115,
      shipping_cost: 8,
      coupon: { amount: 5.5 },
      order_items: [
        {
          quantity: 2,
          sale_fee: 12.05,
          item: { id: 'MLB123', title: 'Produto Teste' },
        },
      ],
    });
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const order = await adapter.fetchOrder({
      accessToken: 'ml-access-token',
      resource: '/orders/2000000001',
    });

    expect(order.financial).toEqual({
      currency: 'BRL',
      revenueAmount: '120.5',
      paidAmount: '115',
      channelFeeAmount: '12.05',
      freightAmount: '8',
      discountAmount: '5.5',
    });
    expect(JSON.stringify(order)).not.toContain('ml-access-token');
  });
});
