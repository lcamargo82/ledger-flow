import { Injectable } from '@nestjs/common';
import { ChannelProvider } from '@prisma/client';
import {
  ChannelProviderAdapter,
  ChannelProviderCapabilities,
} from '../../domain/interfaces/channel-provider-adapter.interface';

@Injectable()
export class MercadoLivreChannelAdapter implements ChannelProviderAdapter {
  readonly provider = ChannelProvider.MERCADO_LIVRE;

  readonly capabilities: ChannelProviderCapabilities = {
    oauth: true,
    listingImport: true,
    webhooks: true,
    inventorySync: true,
    orderIntake: true,
  };
}
