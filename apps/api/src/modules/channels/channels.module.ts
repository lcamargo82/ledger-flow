import { Module } from '@nestjs/common';
import { ChannelsFoundationController } from './presentation/controllers/channels-foundation.controller';

@Module({
  controllers: [ChannelsFoundationController],
})
export class ChannelsModule {}
