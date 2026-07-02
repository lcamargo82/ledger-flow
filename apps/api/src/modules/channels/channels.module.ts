import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { ChannelsService } from './application/services/channels.service';
import { ChannelWebhookIntakeService } from './application/services/channel-webhook-intake.service';
import { CHANNELS_REPOSITORY } from './domain/repositories/channels.repository';
import { PrismaChannelsRepository } from './infra/repositories/prisma-channels.repository';
import { ChannelWebhooksController } from './presentation/controllers/channel-webhooks.controller';
import { ChannelsController } from './presentation/controllers/channels.controller';
import { ChannelsFoundationController } from './presentation/controllers/channels-foundation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChannelsFoundationController, ChannelsController, ChannelWebhooksController],
  providers: [
    ChannelsService,
    ChannelWebhookIntakeService,
    {
      provide: CHANNELS_REPOSITORY,
      useClass: PrismaChannelsRepository,
    },
  ],
})
export class ChannelsModule {}
