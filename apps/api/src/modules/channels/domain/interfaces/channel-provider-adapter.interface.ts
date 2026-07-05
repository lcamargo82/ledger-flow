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
}

export interface ChannelOrderAdapter extends ChannelProviderAdapter {
  fetchOrder(input: ChannelOrderFetchInput): Promise<ChannelOrderDetails>;
}
