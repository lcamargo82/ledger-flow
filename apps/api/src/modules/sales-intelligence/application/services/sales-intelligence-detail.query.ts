import { ChannelProvider, Prisma, WebhookProvider } from '@prisma/client';

export const salesIntelligenceDetailSelect = {
  id: true,
  orderNumber: true,
  status: true,
  customerName: true,
  createdAt: true,
  confirmedAt: true,
  fulfilledAt: true,
  cancelledAt: true,
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      skuId: true,
      warehouseId: true,
      reservationId: true,
      quantity: true,
      sku: {
        select: {
          id: true,
          skuDisplay: true,
          averageCost: true,
          product: { select: { name: true } },
        },
      },
      warehouse: { select: { name: true, code: true } },
      reservation: { select: { status: true } },
    },
  },
  financialFacts: {
    where: { channelProvider: ChannelProvider.MERCADO_LIVRE, isCurrent: true },
    orderBy: [{ version: 'desc' }, { calculatedAt: 'desc' }],
    take: 1,
    select: {
      id: true,
      channelProvider: true,
      externalOrderId: true,
      paymentStatus: true,
      paidAmount: true,
      revenueAmount: true,
      channelFeeAmount: true,
      estimatedNetAmount: true,
      cogsAmount: true,
      soldAt: true,
      calculatedAt: true,
      currency: true,
      components: true,
    },
  },
  shippingSummaries: {
    where: { provider: ChannelProvider.MERCADO_LIVRE },
    orderBy: { updatedAt: 'desc' },
    take: 1,
    select: {
      id: true,
      status: true,
      substatus: true,
      shippingMode: true,
      logisticType: true,
      handlingEstimateAt: true,
      deliveryEstimateAt: true,
      postedAt: true,
      trackingCodeMasked: true,
      updatedAt: true,
    },
  },
  reconciliationCases: {
    where: { settlementEvent: { provider: WebhookProvider.MERCADO_PAGO } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      status: true,
      matchedAt: true,
      reconciledAt: true,
      updatedAt: true,
      payment: { select: { id: true, status: true, reference: true } },
      decisions: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, action: true, reasonCode: true, createdAt: true },
      },
      settlementEvent: {
        select: {
          id: true,
          provider: true,
          providerStatus: true,
          eventType: true,
          amountMinor: true,
          feeAmountMinor: true,
          netAmountMinor: true,
          currency: true,
          availableAt: true,
          occurredAt: true,
          receivedAt: true,
          operationalFinancialAccountId: true,
        },
      },
    },
  },
} satisfies Prisma.InternalOrderSelect;

export type SalesIntelligenceDetailOrder = Prisma.InternalOrderGetPayload<{
  select: typeof salesIntelligenceDetailSelect;
}>;
