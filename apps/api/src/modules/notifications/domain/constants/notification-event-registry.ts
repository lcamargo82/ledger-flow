import { NotificationCategory, NotificationSeverity } from '@prisma/client';
import {
  CommerceCapabilities,
  NotificationCapabilities,
  ReconciliationCapabilities,
  type PlatformCapability,
} from '../../../platform/domain/constants/platform-capabilities';

export interface NotificationEventContract {
  category: NotificationCategory;
  severity: NotificationSeverity;
  titleKey: string;
  messageKey: string;
  requiredPermissions: string[];
  requiredCapabilities: PlatformCapability[];
}

const NOTIFICATION_EVENT_REGISTRY = {
  'channel.inventory_sync.failed': {
    category: NotificationCategory.CHANNELS,
    severity: NotificationSeverity.ERROR,
    titleKey: 'notifications.events.channelInventorySyncFailed.title',
    messageKey: 'notifications.events.channelInventorySyncFailed.message',
    requiredPermissions: ['channels:read', 'channels:manage'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.ChannelsSyncInventory,
    ],
  },
  'channel.order.shipping_summary.updated': {
    category: NotificationCategory.CHANNELS,
    severity: NotificationSeverity.INFO,
    titleKey: 'notifications.events.channelOrderShippingSummaryUpdated.title',
    messageKey: 'notifications.events.channelOrderShippingSummaryUpdated.message',
    requiredPermissions: ['orders:read', 'channels:read'],
    requiredCapabilities: [NotificationCapabilities.Read, CommerceCapabilities.OrdersManage],
  },
  'reconciliation.case.divergent': {
    category: NotificationCategory.RECONCILIATION,
    severity: NotificationSeverity.WARNING,
    titleKey: 'notifications.events.reconciliationDivergence.title',
    messageKey: 'notifications.events.reconciliationDivergence.message',
    requiredPermissions: ['reconciliation:read', 'reconciliation:manage'],
    requiredCapabilities: [NotificationCapabilities.Read, ReconciliationCapabilities.Read],
  },
  'mercado_pago.connection_reauth_required': {
    category: NotificationCategory.PAYMENTS,
    severity: NotificationSeverity.ERROR,
    titleKey: 'notifications.events.mercadoPagoConnectionReauthRequired.title',
    messageKey: 'notifications.events.mercadoPagoConnectionReauthRequired.message',
    requiredPermissions: ['gateways:read', 'gateways:manage'],
    requiredCapabilities: [NotificationCapabilities.Read],
  },
} satisfies Record<string, NotificationEventContract>;

export type RegisteredNotificationEventType = keyof typeof NOTIFICATION_EVENT_REGISTRY;

export const getRegisteredNotificationEventTypes = (): RegisteredNotificationEventType[] =>
  Object.keys(NOTIFICATION_EVENT_REGISTRY) as RegisteredNotificationEventType[];

export const isRegisteredNotificationEventType = (
  eventType: string,
): eventType is RegisteredNotificationEventType => eventType in NOTIFICATION_EVENT_REGISTRY;

export const getNotificationEventContract = (eventType: string): NotificationEventContract => {
  const contract = NOTIFICATION_EVENT_REGISTRY[eventType as RegisteredNotificationEventType];

  if (!contract) {
    throw new Error(`Notification event type is not registered: ${eventType}`);
  }

  return contract;
};

export const getVisibleNotificationEventTypes = (
  permissions: string[],
  capabilities: string[],
): RegisteredNotificationEventType[] =>
  (
    Object.entries(NOTIFICATION_EVENT_REGISTRY) as [
      RegisteredNotificationEventType,
      NotificationEventContract,
    ][]
  )
    .filter(([, contract]) =>
      contract.requiredPermissions.some((permission) => permissions.includes(permission)),
    )
    .filter(([, contract]) =>
      contract.requiredCapabilities.every((capability) => capabilities.includes(capability)),
    )
    .map(([eventType]) => eventType);
