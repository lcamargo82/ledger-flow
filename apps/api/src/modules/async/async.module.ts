import { Module } from '@nestjs/common';
import { PrismaOutboxRepository } from './infra/repositories/prisma-outbox.repository';
import { PrismaAsyncJobExecutionRepository } from './infra/repositories/prisma-async-job-execution.repository';
import { OutboxDispatcherService } from './application/services/outbox-dispatcher.service';
import { AsyncHandlerRegistryService } from './application/services/async-handler-registry.service';
import { AsyncJobRetryService } from './application/services/async-job-retry.service';
import { AsyncJobReplayService } from './application/services/async-job-replay.service';
import { RabbitMQPublisher } from './infra/rabbitmq/rabbitmq.publisher';
import { RabbitMQConsumer } from './infra/rabbitmq/rabbitmq.consumer';
import { RedisExternalProviderRateLimitService } from './infra/redis/redis-external-provider-rate-limit.service';
import { PlatformAsyncJobsController } from './presentation/controllers/platform-async-jobs.controller';

@Module({
  controllers: [PlatformAsyncJobsController],
  providers: [
    { provide: 'OutboxRepository', useClass: PrismaOutboxRepository },
    { provide: 'AsyncJobExecutionRepository', useClass: PrismaAsyncJobExecutionRepository },
    { provide: 'AsyncMessagePublisher', useClass: RabbitMQPublisher },
    { provide: 'ExternalProviderExecutionPolicy', useClass: RedisExternalProviderRateLimitService },
    OutboxDispatcherService,
    AsyncHandlerRegistryService,
    AsyncJobRetryService,
    AsyncJobReplayService,
    RabbitMQConsumer,
  ],
  exports: [
    'OutboxRepository',
    'AsyncMessagePublisher',
    'ExternalProviderExecutionPolicy',
    AsyncHandlerRegistryService,
  ],
})
export class AsyncModule {}
