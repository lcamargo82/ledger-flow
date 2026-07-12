import { ChannelProvider } from '@prisma/client';

export interface ChannelProviderCapabilities {
  oauth: boolean;
  listingImport: boolean;
  webhooks: boolean;
  inventorySync: boolean;
  orderIntake: boolean;
}

export interface ChannelProviderAdapter {
  readonly provider: ChannelProvider;
  readonly capabilities: ChannelProviderCapabilities;
}

export interface ChannelListingImportInput {
  accessToken: string;
  externalAccountId: string;
  maxPages?: number;
  pageSize?: number;
}

export interface ChannelListingImportItem {
  externalListingId: string;
  title: string;
  externalSku?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelListingImportAdapter extends ChannelProviderAdapter {
  fetchListings(input: ChannelListingImportInput): Promise<ChannelListingImportItem[]>;
}

export interface ChannelOrderFetchInput {
  accessToken: string;
  resource: string;
}

export interface ChannelOrderItem {
  externalListingId: string;
  title?: string;
  quantity: number;
}

export interface ChannelOrderDetails {
  externalOrderId: string;
  status: string;
  buyerName?: string;
  items: ChannelOrderItem[];
  financial?: {
    currency?: string;
    revenueAmount?: string;
    paidAmount?: string;
    channelFeeAmount?: string;
    freightAmount?: string;
    discountAmount?: string;
  };
  shipping?: {
    externalShipmentId?: string;
    status?: string;
    substatus?: string;
    shippingMode?: string;
    logisticType?: string;
    handlingEstimateAt?: string;
    deliveryEstimateAt?: string;
    postedAt?: string;
    trackingCodeMasked?: string;
    source: string;
    confidence: number;
  };
}

export interface ChannelOrderAdapter extends ChannelProviderAdapter {
  fetchOrder(input: ChannelOrderFetchInput): Promise<ChannelOrderDetails>;
}

export interface ChannelInventoryUpdateInput {
  accessToken: string;
  externalListingId: string;
  availableQuantity: number;
}

export type ChannelInventoryUpdateResult =
  | {
      ok: true;
      providerStatus: string;
      externalListingId: string;
      availableQuantity: number;
    }
  | {
      ok: false;
      errorCode: string;
      errorSummary: string;
      retryAfterSeconds?: number;
    };

export interface ChannelInventorySyncAdapter extends ChannelProviderAdapter {
  updateListingStock(input: ChannelInventoryUpdateInput): Promise<ChannelInventoryUpdateResult>;
}
