import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { ChannelsService } from './application/services/channels.service';
import { ChannelInventorySyncService } from './application/services/channel-inventory-sync.service';
import { ChannelWebhookIntakeService } from './application/services/channel-webhook-intake.service';
import { CHANNELS_REPOSITORY } from './domain/repositories/channels.repository';
import { MercadoLivreChannelAdapter } from './infra/adapters/mercado-livre-channel.adapter';
import { PrismaChannelsRepository } from './infra/repositories/prisma-channels.repository';
import { ChannelWebhooksController } from './presentation/controllers/channel-webhooks.controller';
import { ChannelsController } from './presentation/controllers/channels.controller';
import { ChannelsFoundationController } from './presentation/controllers/channels-foundation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChannelsFoundationController, ChannelsController, ChannelWebhooksController],
  providers: [
    ChannelsService,
    ChannelInventorySyncService,
    ChannelWebhookIntakeService,
    MercadoLivreChannelAdapter,
    {
      provide: CHANNELS_REPOSITORY,
      useClass: PrismaChannelsRepository,
    },
  ],
  exports: [ChannelInventorySyncService],
})
export class ChannelsModule {}
