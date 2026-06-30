import { Module } from '@nestjs/common';
import { PrismaOutboxRepository } from './infra/repositories/prisma-outbox.repository';
import { PrismaAsyncJobExecutionRepository } from './infra/repositories/prisma-async-job-execution.repository';
import { OutboxDispatcherService } from './application/services/outbox-dispatcher.service';
import { AsyncHandlerRegistryService } from './application/services/async-handler-registry.service';
import { AsyncJobRetryService } from './application/services/async-job-retry.service';
import { AsyncJobReplayService } from './application/services/async-job-replay.service';
import { RabbitMQPublisher } from './infra/rabbitmq/rabbitmq.publisher';
import { RabbitMQConsumer } from './infra/rabbitmq/rabbitmq.consumer';
import { RabbitMqTopologyService } from './infra/rabbitmq/rabbitmq-topology.service';
import { RedisExternalProviderRateLimitService } from './infra/redis/redis-external-provider-rate-limit.service';
import { PlatformAsyncJobsController } from './presentation/controllers/platform-async-jobs.controller';

import { OutboxRepository } from './domain/interfaces/outbox.repository';
import { AsyncJobExecutionRepository } from './domain/interfaces/async-job-execution.repository';
import { AsyncMessagePublisher } from './domain/interfaces/async-message-publisher.interface';
import { ExternalProviderExecutionPolicy } from './domain/interfaces/external-provider-execution-policy.interface';

@Module({
  controllers: [PlatformAsyncJobsController],
  providers: [
    { provide: OutboxRepository, useClass: PrismaOutboxRepository },
    { provide: AsyncJobExecutionRepository, useClass: PrismaAsyncJobExecutionRepository },
    { provide: AsyncMessagePublisher, useClass: RabbitMQPublisher },
    { provide: ExternalProviderExecutionPolicy, useClass: RedisExternalProviderRateLimitService },
    OutboxDispatcherService,
    AsyncHandlerRegistryService,
    AsyncJobRetryService,
    AsyncJobReplayService,
    RabbitMqTopologyService,
    RabbitMQConsumer,
  ],
  exports: [
    OutboxRepository,
    AsyncMessagePublisher,
    ExternalProviderExecutionPolicy,
    AsyncHandlerRegistryService,
  ],
})
export class AsyncModule {}
