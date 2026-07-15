import { ChannelProvider } from '@prisma/client';
import { MercadoLivreChannelAdapter } from './mercado-livre-channel.adapter';

describe('MercadoLivreChannelAdapter', () => {
  const apiClient = {
    searchSellerItems: jest.fn(),
    getItem: jest.fn(),
    getOrder: jest.fn(),
    updateItemStock: jest.fn(),
    getUserProductStock: jest.fn(),
    updateUserProductSellerWarehouseStock: jest.fn(),
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
        scroll_id: 'cursor-1',
        paging: { total: 3, offset: 0, limit: 2 },
      })
      .mockResolvedValueOnce({
        results: ['MLB-3'],
        scroll_id: null,
        paging: { total: 3, offset: 2, limit: 2 },
      });
    apiClient.getItem
      .mockResolvedValueOnce({
        id: 'MLB-1',
        user_product_id: 'MLBU4292355491',
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
      limit: 2,
      searchType: 'scan',
    });
    expect(apiClient.searchSellerItems).toHaveBeenNthCalledWith(2, {
      accessToken: 'ml-access-token',
      sellerId: 'seller-1',
      limit: 2,
      searchType: 'scan',
      scrollId: 'cursor-1',
    });
    expect(result).toEqual([
      {
        externalListingId: 'MLB-1',
        externalUserProductId: 'MLBU4292355491',
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

  it('imports beyond five pages by default and stops on an empty scan page', async () => {
    for (let page = 1; page <= 6; page += 1) {
      apiClient.searchSellerItems.mockResolvedValueOnce({
        results: [`MLB-${page}`],
        scroll_id: `cursor-${page}`,
        paging: { total: 6, offset: page - 1, limit: 1 },
      });
    }
    apiClient.searchSellerItems.mockResolvedValueOnce({
      results: [],
      scroll_id: null,
      paging: { total: 6, offset: 6, limit: 1 },
    });
    apiClient.getItem.mockImplementation((_accessToken: string, itemId: string) =>
      Promise.resolve({ id: itemId, title: itemId }),
    );
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const result = await adapter.fetchListings({
      accessToken: 'ml-access-token',
      externalAccountId: 'seller-1',
      pageSize: 1,
    });

    expect(result).toHaveLength(6);
    expect(apiClient.searchSellerItems).toHaveBeenCalledTimes(7);
  });

  it('stops safely when a scan page repeats already imported item IDs', async () => {
    apiClient.searchSellerItems
      .mockResolvedValueOnce({
        results: ['MLB-1'],
        scroll_id: 'cursor-1',
        paging: { total: 2, offset: 0, limit: 1 },
      })
      .mockResolvedValueOnce({
        results: ['MLB-1'],
        scroll_id: 'cursor-1',
        paging: { total: 2, offset: 1, limit: 1 },
      });
    apiClient.getItem.mockResolvedValue({ id: 'MLB-1', title: 'Produto' });
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const result = await adapter.fetchListings({
      accessToken: 'ml-access-token',
      externalAccountId: 'seller-1',
    });

    expect(result).toHaveLength(1);
    expect(apiClient.searchSellerItems).toHaveBeenCalledTimes(2);
    expect(apiClient.getItem).toHaveBeenCalledTimes(1);
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

  it('updates multi-origin stock by User Product and configured seller warehouse', async () => {
    apiClient.getUserProductStock.mockResolvedValue({
      version: '7',
      data: {
        id: 'MLBU4292355491',
        locations: [
          {
            type: 'seller_warehouse',
            store_id: 'store-1',
            network_node_id: 'node-1',
            quantity: 3,
          },
        ],
      },
    });
    apiClient.updateUserProductSellerWarehouseStock.mockResolvedValue(undefined);
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const result = await adapter.updateListingStock({
      accessToken: 'ml-access-token',
      externalListingId: 'MLB-1',
      externalUserProductId: 'MLBU4292355491',
      sellerWarehouseLocation: { storeId: 'store-1', networkNodeId: 'node-1' },
      availableQuantity: 7,
    });

    expect(apiClient.updateUserProductSellerWarehouseStock).toHaveBeenCalledWith({
      accessToken: 'ml-access-token',
      externalUserProductId: 'MLBU4292355491',
      version: '7',
      storeId: 'store-1',
      networkNodeId: 'node-1',
      availableQuantity: 7,
    });
    expect(apiClient.updateItemStock).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      providerStatus: 'updated',
      externalListingId: 'MLB-1',
      availableQuantity: 7,
    });
  });

  it('blocks multi-origin stock writes without an explicit warehouse mapping', async () => {
    apiClient.getUserProductStock.mockResolvedValue({
      version: '7',
      data: {
        id: 'MLBU4292355491',
        locations: [{ type: 'seller_warehouse', store_id: 'store-1' }],
      },
    });
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const result = await adapter.updateListingStock({
      accessToken: 'ml-access-token',
      externalListingId: 'MLB-1',
      externalUserProductId: 'MLBU4292355491',
      availableQuantity: 7,
    });

    expect(result).toEqual({
      ok: false,
      errorCode: 'WAREHOUSE_MAPPING_REQUIRED',
      errorSummary: 'Mercado Livre seller warehouse mapping is required.',
    });
    expect(apiClient.updateItemStock).not.toHaveBeenCalled();
  });

  it('normalizes optional Mercado Livre order financial components', async () => {
    apiClient.getOrder.mockResolvedValue({
      id: 2000000001,
      status: 'paid',
      date_created: '2026-07-14T10:30:00.000-03:00',
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
      paymentStatus: 'paid',
      soldAt: '2026-07-14T13:30:00.000Z',
      revenueAmount: '120.5',
      paidAmount: '115',
      channelFeeAmount: '12.05',
      estimatedNetAmount: '102.95',
      freightAmount: '8',
      discountAmount: '5.5',
    });
    expect(JSON.stringify(order)).not.toContain('ml-access-token');
  });

  it('does not assume an estimated net amount when the marketplace fee is unavailable', async () => {
    apiClient.getOrder.mockResolvedValue({
      id: 2000000002,
      status: 'paid',
      currency_id: 'BRL',
      paid_amount: 115,
      order_items: [{ quantity: 1, item: { id: 'MLB124', title: 'Produto sem taxa' } }],
    });
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const order = await adapter.fetchOrder({
      accessToken: 'ml-access-token',
      resource: '/orders/2000000002',
    });

    expect(order.financial).toEqual(
      expect.objectContaining({ paidAmount: '115', paymentStatus: 'paid' }),
    );
    expect(order.financial).not.toHaveProperty('estimatedNetAmount');
  });

  it('normalizes Mercado Livre shipping summary with string IDs and masked tracking', async () => {
    apiClient.getOrder.mockResolvedValue({
      id: 2000000001,
      status: 'paid',
      shipping: {
        id: 987654321,
        status: 'ready_to_ship',
        substatus: 'printed',
        mode: 'me2',
        logistic_type: 'drop_off',
        date_handling: '2026-07-12T10:00:00.000-03:00',
        estimated_delivery: {
          date: '2026-07-15T10:00:00.000-03:00',
        },
        tracking_number: 'BR123456789ML',
      },
      order_items: [
        {
          quantity: 1,
          item: { id: 'MLB123', title: 'Produto Teste' },
        },
      ],
    });
    const adapter = new MercadoLivreChannelAdapter(apiClient as never);

    const order = await adapter.fetchOrder({
      accessToken: 'ml-access-token',
      resource: '/orders/2000000001',
    });

    expect(order.shipping).toEqual({
      externalShipmentId: '987654321',
      status: 'ready_to_ship',
      substatus: 'printed',
      shippingMode: 'me2',
      logisticType: 'drop_off',
      handlingEstimateAt: '2026-07-12T13:00:00.000Z',
      deliveryEstimateAt: '2026-07-15T13:00:00.000Z',
      trackingCodeMasked: '*********89ML',
      source: 'MERCADO_LIVRE_ORDER',
      confidence: 0.7,
    });
    expect(JSON.stringify(order)).not.toContain('BR123456789ML');
    expect(JSON.stringify(order)).not.toContain('ml-access-token');
  });
});
