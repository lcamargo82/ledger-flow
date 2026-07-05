import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import { AsyncModule } from '../async/async.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { OrdersModule } from '../orders/orders.module';
import { ChannelWebhookReceivedAsyncHandler } from './application/async-handlers/channel-webhook-received.handler';
import { ChannelOrderIntakeService } from './application/services/channel-order-intake.service';
import { ChannelsService } from './application/services/channels.service';
import { ChannelInventorySyncService } from './application/services/channel-inventory-sync.service';
import { ChannelWebhookIntakeService } from './application/services/channel-webhook-intake.service';
import { MercadoLivreOAuthService } from './application/services/mercado-livre-oauth.service';
import { MercadoLivreOAuthStateService } from './application/services/mercado-livre-oauth-state.service';
import { CHANNELS_REPOSITORY } from './domain/repositories/channels.repository';
import { MercadoLivreApiClient } from './infra/clients/mercado-livre-api.client';
import { MercadoLivreChannelAdapter } from './infra/adapters/mercado-livre-channel.adapter';
import { PrismaChannelsRepository } from './infra/repositories/prisma-channels.repository';
import { ChannelWebhooksController } from './presentation/controllers/channel-webhooks.controller';
import { ChannelsController } from './presentation/controllers/channels.controller';
import { ChannelsFoundationController } from './presentation/controllers/channels-foundation.controller';
import { MercadoLivreOAuthController } from './presentation/controllers/mercado-livre-oauth.controller';

@Module({
  imports: [PrismaModule, AsyncModule, GatewaysModule, OrdersModule],
  controllers: [
    ChannelsFoundationController,
    ChannelsController,
    ChannelWebhooksController,
    MercadoLivreOAuthController,
  ],
  providers: [
    ChannelsService,
    ChannelInventorySyncService,
    ChannelOrderIntakeService,
    ChannelWebhookIntakeService,
    ChannelWebhookReceivedAsyncHandler,
    MercadoLivreApiClient,
    MercadoLivreChannelAdapter,
    MercadoLivreOAuthService,
    MercadoLivreOAuthStateService,
    {
      provide: CHANNELS_REPOSITORY,
      useClass: PrismaChannelsRepository,
    },
  ],
  exports: [ChannelInventorySyncService],
})
export class ChannelsModule implements OnModuleInit {
  constructor(
    private readonly asyncHandlerRegistry: AsyncHandlerRegistryService,
    private readonly channelWebhookReceivedHandler: ChannelWebhookReceivedAsyncHandler,
  ) {}

  onModuleInit() {
    this.asyncHandlerRegistry.register(this.channelWebhookReceivedHandler);
  }
}
