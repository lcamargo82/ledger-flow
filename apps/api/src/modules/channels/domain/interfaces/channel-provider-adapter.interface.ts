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
