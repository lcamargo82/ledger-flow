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
