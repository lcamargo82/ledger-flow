import { BadRequestException } from '@nestjs/common';
import {
  ChannelIntegrationStatus,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookStatus,
  InternalOrderStatus,
} from '@prisma/client';
import { ChannelOrderIntakeService } from './channel-order-intake.service';

describe('ChannelOrderIntakeService', () => {
  const channelsRepository = {
    findInboxById: jest.fn(),
    findListingByExternalId: jest.fn(),
    markInboxProcessed: jest.fn(),
    markInboxFailed: jest.fn(),
  };
  const ordersService = {
    create: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    fulfill: jest.fn(),
  };
  const mercadoLivreAdapter = {
    fetchOrder: jest.fn(),
  };
  const credentialsEncryptionService = {
    decrypt: jest.fn(),
  };
  const prisma = {
    orderShippingSummary: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };
  const financialIntelligenceService = {
    createChannelOrderOperationalFact: jest.fn(),
  };

  const integration = {
    id: 'integration-1',
    tenantId: 'tenant-1',
    provider: ChannelProvider.MERCADO_LIVRE,
    status: ChannelIntegrationStatus.ACTIVE,
    externalAccountId: 'seller-123',
    defaultWarehouseId: 'warehouse-1',
    encryptedCredentials: {
      version: 1,
      algorithm: 'aes-256-gcm',
      ciphertext: 'ciphertext',
    },
  };

  const inboxEvent = {
    id: 'inbox-1',
    tenantId: 'tenant-1',
    integrationId: 'integration-1',
    provider: ChannelProvider.MERCADO_LIVRE,
    providerEventId: 'orders_v2:/orders/2000000001:seller-123:app-1',
    eventType: 'orders_v2',
    status: ChannelWebhookStatus.RECEIVED,
    payloadSummary: {
      topic: 'orders_v2',
      resource: '/orders/2000000001',
      userId: 'seller-123',
      applicationId: 'app-1',
    },
    integration,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    channelsRepository.findInboxById.mockResolvedValue(inboxEvent);
    channelsRepository.findListingByExternalId.mockResolvedValue({
      id: 'listing-1',
      tenantId: 'tenant-1',
      integrationId: 'integration-1',
      externalListingId: 'MLB123',
      matchStatus: ChannelListingMatchStatus.MATCHED,
      matchedSkuId: 'sku-1',
    });
    ordersService.create.mockResolvedValue({
      order: {
        id: 'order-1',
        status: InternalOrderStatus.DRAFT,
      },
    });
    ordersService.confirm.mockResolvedValue({
      order: {
        id: 'order-1',
        status: InternalOrderStatus.CONFIRMED,
      },
    });
    ordersService.cancel.mockResolvedValue({
      order: {
        id: 'order-1',
        status: InternalOrderStatus.CANCELLED,
      },
    });
    ordersService.fulfill.mockResolvedValue({
      order: {
        id: 'order-1',
        status: InternalOrderStatus.FULFILLED,
      },
    });
    mercadoLivreAdapter.fetchOrder.mockResolvedValue({
      externalOrderId: '2000000001',
      status: 'paid',
      buyerName: 'Comprador Teste',
      items: [
        {
          externalListingId: 'MLB123',
          title: 'Produto Teste',
          quantity: 2,
        },
      ],
    });
    credentialsEncryptionService.decrypt.mockReturnValue({
      accessToken: 'ml-access-token',
      refreshToken: 'ml-refresh-token',
    });
    prisma.orderShippingSummary.findUnique.mockResolvedValue(null);
    prisma.orderShippingSummary.upsert.mockResolvedValue({
      id: 'shipping-summary-1',
    });
  });

  function makeService() {
    return new ChannelOrderIntakeService(
      channelsRepository as never,
      ordersService as never,
      mercadoLivreAdapter as never,
      credentialsEncryptionService as never,
      prisma as never,
      financialIntelligenceService as never,
    );
  }

  it('creates and confirms paid Mercado Livre orders from webhook inbox events', async () => {
    const result = await makeService().processInboxEvent('inbox-1');

    expect(credentialsEncryptionService.decrypt).toHaveBeenCalledWith(
      JSON.stringify(integration.encryptedCredentials),
    );
    expect(mercadoLivreAdapter.fetchOrder).toHaveBeenCalledWith({
      accessToken: 'ml-access-token',
      resource: '/orders/2000000001',
    });
    expect(channelsRepository.findListingByExternalId).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      integrationId: 'integration-1',
      externalListingId: 'MLB123',
    });
    expect(ordersService.create).toHaveBeenCalledWith('tenant-1', 'channel:integration-1', {
      idempotencyKey: 'channel:MERCADO_LIVRE:integration-1:order:2000000001',
      customerName: 'Comprador Teste',
      notes: 'Mercado Livre order 2000000001',
      items: [
        {
          skuId: 'sku-1',
          warehouseId: 'warehouse-1',
          quantity: 2,
        },
      ],
    });
    expect(ordersService.confirm).toHaveBeenCalledWith(
      'order-1',
      'tenant-1',
      'channel:integration-1',
      {
        reasonCode: 'CHANNEL_ORDER_PAID',
        idempotencyKey: 'channel:MERCADO_LIVRE:integration-1:order:2000000001:confirm',
        notes: 'Mercado Livre status paid',
      },
    );
    expect(channelsRepository.markInboxProcessed).toHaveBeenCalledWith('inbox-1');
    expect(JSON.stringify(channelsRepository.markInboxProcessed.mock.calls)).not.toContain(
      'ml-access-token',
    );
    expect(result.orderId).toBe('order-1');
    expect(result.status).toBe(InternalOrderStatus.CONFIRMED);
  });

  it('creates operational financial facts when Mercado Livre financial data is available', async () => {
    mercadoLivreAdapter.fetchOrder.mockResolvedValueOnce({
      externalOrderId: '2000000001',
      status: 'paid',
      buyerName: 'Comprador Teste',
      financial: {
        currency: 'BRL',
        revenueAmount: '120.5',
        paidAmount: '115',
        channelFeeAmount: '12.05',
        freightAmount: '8',
        discountAmount: '5.5',
      },
      items: [
        {
          externalListingId: 'MLB123',
          title: 'Produto Teste',
          quantity: 2,
        },
      ],
    });

    await makeService().processInboxEvent('inbox-1');

    expect(financialIntelligenceService.createChannelOrderOperationalFact).toHaveBeenCalledWith(
      'order-1',
      'tenant-1',
      'channel:integration-1',
      {
        provider: ChannelProvider.MERCADO_LIVRE,
        externalOrderId: '2000000001',
        currency: 'BRL',
        revenueAmount: '120.5',
        paidAmount: '115',
        channelFeeAmount: '12.05',
        freightAmount: '8',
        discountAmount: '5.5',
      },
    );
  });

  it('persists sanitized shipping summary and emits an idempotent operational event', async () => {
    mercadoLivreAdapter.fetchOrder.mockResolvedValueOnce({
      externalOrderId: '2000000001',
      status: 'paid',
      buyerName: 'Comprador Teste',
      shipping: {
        externalShipmentId: '987654321',
        status: 'ready_to_ship',
        substatus: 'printed',
        shippingMode: 'me2',
        logisticType: 'drop_off',
        handlingEstimateAt: '2026-07-12T10:00:00.000Z',
        deliveryEstimateAt: '2026-07-15T10:00:00.000Z',
        trackingCodeMasked: '********1234',
        source: 'MERCADO_LIVRE_ORDER',
        confidence: 0.7,
      },
      items: [
        {
          externalListingId: 'MLB123',
          title: 'Produto Teste',
          quantity: 2,
        },
      ],
    });

    await makeService().processInboxEvent('inbox-1');

    expect(prisma.orderShippingSummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_orderId_provider: {
            tenantId: 'tenant-1',
            orderId: 'order-1',
            provider: ChannelProvider.MERCADO_LIVRE,
          },
        },
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          provider: ChannelProvider.MERCADO_LIVRE,
          externalOrderId: '2000000001',
          externalShipmentId: '987654321',
          trackingCodeMasked: '********1234',
        }),
      }),
    );
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        aggregateType: 'OrderShippingSummary',
        aggregateId: 'shipping-summary-1',
        eventType: 'channel.order.shipping_summary.updated',
        payload: expect.objectContaining({
          externalShipmentId: '987654321',
          trackingCodeMasked: '********1234',
        }),
      }),
    });
    expect(JSON.stringify(prisma.outboxEvent.create.mock.calls)).not.toContain('ml-access-token');
  });

  it('does not emit another shipping outbox event when summary did not change', async () => {
    prisma.orderShippingSummary.findUnique.mockResolvedValueOnce({
      externalOrderId: '2000000001',
      externalShipmentId: '987654321',
      status: 'ready_to_ship',
      substatus: null,
      shippingMode: null,
      logisticType: null,
      handlingEstimateAt: null,
      deliveryEstimateAt: null,
      postedAt: null,
      trackingCodeMasked: '********1234',
      source: 'MERCADO_LIVRE_ORDER',
      confidence: 0.7,
    });
    mercadoLivreAdapter.fetchOrder.mockResolvedValueOnce({
      externalOrderId: '2000000001',
      status: 'paid',
      buyerName: 'Comprador Teste',
      shipping: {
        externalShipmentId: '987654321',
        status: 'ready_to_ship',
        trackingCodeMasked: '********1234',
        source: 'MERCADO_LIVRE_ORDER',
        confidence: 0.7,
      },
      items: [
        {
          externalListingId: 'MLB123',
          title: 'Produto Teste',
          quantity: 2,
        },
      ],
    });

    await makeService().processInboxEvent('inbox-1');

    expect(prisma.orderShippingSummary.upsert).toHaveBeenCalled();
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('cancels existing Mercado Livre orders and lets OrdersService release reservations', async () => {
    mercadoLivreAdapter.fetchOrder.mockResolvedValueOnce({
      externalOrderId: '2000000001',
      status: 'cancelled',
      buyerName: 'Comprador Teste',
      items: [
        {
          externalListingId: 'MLB123',
          title: 'Produto Teste',
          quantity: 2,
        },
      ],
    });
    ordersService.create.mockResolvedValueOnce({
      order: {
        id: 'order-1',
        status: InternalOrderStatus.CONFIRMED,
      },
    });

    await makeService().processInboxEvent('inbox-1');

    expect(ordersService.cancel).toHaveBeenCalledWith(
      'order-1',
      'tenant-1',
      'channel:integration-1',
      {
        reasonCode: 'CHANNEL_ORDER_CANCELLED',
        idempotencyKey: 'channel:MERCADO_LIVRE:integration-1:order:2000000001:cancel',
        notes: 'Mercado Livre status cancelled',
      },
    );
    expect(ordersService.confirm).not.toHaveBeenCalled();
  });

  it('fails closed when order items are not mapped to a SKU', async () => {
    channelsRepository.findListingByExternalId.mockResolvedValueOnce({
      id: 'listing-1',
      tenantId: 'tenant-1',
      integrationId: 'integration-1',
      externalListingId: 'MLB123',
      matchStatus: ChannelListingMatchStatus.UNMATCHED,
      matchedSkuId: null,
    });

    await expect(makeService().processInboxEvent('inbox-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(ordersService.create).not.toHaveBeenCalled();
    expect(channelsRepository.markInboxFailed).toHaveBeenCalledWith(
      'inbox-1',
      'Listing MLB123 is not mapped to a SKU.',
    );
  });

  it('fails closed when the integration has no default warehouse for order reservation', async () => {
    channelsRepository.findInboxById.mockResolvedValueOnce({
      ...inboxEvent,
      integration: {
        ...integration,
        defaultWarehouseId: null,
      },
    });

    await expect(makeService().processInboxEvent('inbox-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(ordersService.create).not.toHaveBeenCalled();
    expect(channelsRepository.markInboxFailed).toHaveBeenCalledWith(
      'inbox-1',
      'Channel integration default warehouse is required.',
    );
  });

  it('ignores non-order topics without provider calls or stock effects', async () => {
    channelsRepository.findInboxById.mockResolvedValueOnce({
      ...inboxEvent,
      eventType: 'items',
      payloadSummary: { topic: 'items', resource: '/items/MLB123' },
    });

    const result = await makeService().processInboxEvent('inbox-1');

    expect(mercadoLivreAdapter.fetchOrder).not.toHaveBeenCalled();
    expect(ordersService.create).not.toHaveBeenCalled();
    expect(channelsRepository.markInboxProcessed).toHaveBeenCalledWith('inbox-1');
    expect(result).toEqual({ ignored: true });
  });
});
