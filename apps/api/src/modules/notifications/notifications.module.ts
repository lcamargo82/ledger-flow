import { Module, OnModuleInit } from '@nestjs/common';
import { AsyncHandlerRegistryService } from '../async/application/services/async-handler-registry.service';
import { AsyncModule } from '../async/async.module';
import { PlatformModule } from '../platform/platform.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { NotificationAudienceResolverService } from './application/services/notification-audience-resolver.service';
import { NotificationAccessPolicyService } from './application/services/notification-access-policy.service';
import { NotificationsService } from './application/services/notifications.service';
import { NotificationFeedService } from './application/services/notification-feed.service';
import { NotificationProducerService } from './application/services/notification-producer.service';
import { NotificationsController } from './presentation/controllers/notifications.controller';
import { NotificationWebhookEndpointPolicyService } from './application/services/notification-webhook-endpoint-policy.service';
import { NotificationWebhookSignerService } from './application/services/notification-webhook-signer.service';
import { NotificationWebhookSecretService } from './application/services/notification-webhook-secret.service';
import { NotificationWebhookHostResolver } from './domain/interfaces/notification-webhook-host-resolver';
import { NodeNotificationWebhookHostResolver } from './infra/dns/node-notification-webhook-host-resolver';
import { NotificationWebhookSubscriptionsService } from './application/services/notification-webhook-subscriptions.service';
import { NotificationWebhookSubscriptionsController } from './presentation/controllers/notification-webhook-subscriptions.controller';
import { NotificationWebhookDeliveryPlannerService } from './application/services/notification-webhook-delivery-planner.service';
import { NotificationWebhookDeliveryExecutorService } from './application/services/notification-webhook-delivery-executor.service';
import { NotificationWebhookDeliveryRequestedHandler } from './application/async-handlers/notification-webhook-delivery-requested.handler';
import { NotificationWebhookOperationsService } from './application/services/notification-webhook-operations.service';

@Module({
  imports: [PlatformModule, GatewaysModule, AsyncModule],
  controllers: [NotificationsController, NotificationWebhookSubscriptionsController],
  providers: [
    NotificationAccessPolicyService,
    NotificationAudienceResolverService,
    NotificationFeedService,
    NotificationProducerService,
    NotificationWebhookEndpointPolicyService,
    NotificationWebhookSignerService,
    NotificationWebhookSecretService,
    NotificationWebhookSubscriptionsService,
    NotificationWebhookDeliveryPlannerService,
    NotificationWebhookDeliveryExecutorService,
    NotificationWebhookDeliveryRequestedHandler,
    NotificationWebhookOperationsService,
    NotificationsService,
    {
      provide: NotificationWebhookHostResolver,
      useClass: NodeNotificationWebhookHostResolver,
    },
  ],
  exports: [NotificationsService, NotificationProducerService],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private readonly asyncHandlerRegistry: AsyncHandlerRegistryService,
    private readonly deliveryRequestedHandler: NotificationWebhookDeliveryRequestedHandler,
  ) {}

  onModuleInit() {
    this.asyncHandlerRegistry.register(this.deliveryRequestedHandler);
  }
}
