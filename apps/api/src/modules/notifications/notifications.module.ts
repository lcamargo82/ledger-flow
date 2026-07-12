import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { NotificationAudienceResolverService } from './application/services/notification-audience-resolver.service';
import { NotificationAccessPolicyService } from './application/services/notification-access-policy.service';
import { NotificationsService } from './application/services/notifications.service';
import { NotificationFeedService } from './application/services/notification-feed.service';
import { NotificationProducerService } from './application/services/notification-producer.service';
import { NotificationsController } from './presentation/controllers/notifications.controller';
import { NotificationWebhookEndpointPolicyService } from './application/services/notification-webhook-endpoint-policy.service';
import { NotificationWebhookSignerService } from './application/services/notification-webhook-signer.service';
import { NotificationWebhookHostResolver } from './domain/interfaces/notification-webhook-host-resolver';
import { NodeNotificationWebhookHostResolver } from './infra/dns/node-notification-webhook-host-resolver';

@Module({
  imports: [PlatformModule],
  controllers: [NotificationsController],
  providers: [
    NotificationAccessPolicyService,
    NotificationAudienceResolverService,
    NotificationFeedService,
    NotificationProducerService,
    NotificationWebhookEndpointPolicyService,
    NotificationWebhookSignerService,
    NotificationsService,
    {
      provide: NotificationWebhookHostResolver,
      useClass: NodeNotificationWebhookHostResolver,
    },
  ],
  exports: [NotificationsService, NotificationProducerService],
})
export class NotificationsModule {}
