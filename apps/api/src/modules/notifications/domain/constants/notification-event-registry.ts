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
  'marketplace_settlement.event_received': {
    category: NotificationCategory.RECONCILIATION,
    severity: NotificationSeverity.INFO,
    titleKey: 'notifications.events.marketplaceSettlementEventReceived.title',
    messageKey: 'notifications.events.marketplaceSettlementEventReceived.message',
    requiredPermissions: ['reconciliation:read', 'marketplace-settlement:read'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      ReconciliationCapabilities.Read,
      ReconciliationCapabilities.MarketplaceSettlementRead,
    ],
  },
  'cash_position.unexplained_difference': {
    category: NotificationCategory.RECONCILIATION,
    severity: NotificationSeverity.WARNING,
    titleKey: 'notifications.events.cashPositionUnexplainedDifference.title',
    messageKey: 'notifications.events.cashPositionUnexplainedDifference.message',
    requiredPermissions: ['reconciliation:read', 'marketplace-settlement:manage'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      ReconciliationCapabilities.Read,
      ReconciliationCapabilities.MarketplaceSettlementManage,
    ],
  },
  'mercado_pago.connection_reauth_required': {
    category: NotificationCategory.PAYMENTS,
    severity: NotificationSeverity.ERROR,
    titleKey: 'notifications.events.mercadoPagoConnectionReauthRequired.title',
    messageKey: 'notifications.events.mercadoPagoConnectionReauthRequired.message',
    requiredPermissions: ['gateways:read', 'gateways:manage'],
    requiredCapabilities: [NotificationCapabilities.Read],
  },
  'mercado_pago.payment_status_updated': {
    category: NotificationCategory.PAYMENTS,
    severity: NotificationSeverity.INFO,
    titleKey: 'notifications.events.mercadoPagoPaymentStatusUpdated.title',
    messageKey: 'notifications.events.mercadoPagoPaymentStatusUpdated.message',
    requiredPermissions: ['payments:read', 'payments:manage'],
    requiredCapabilities: [NotificationCapabilities.Read],
  },
  'sale.loss_detected': {
    category: NotificationCategory.ORDERS,
    severity: NotificationSeverity.ERROR,
    titleKey: 'notifications.events.saleLossDetected.title',
    messageKey: 'notifications.events.saleLossDetected.message',
    requiredPermissions: ['sales-intelligence:view-profitability'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.SalesIntelligenceRead,
    ],
  },
  'sale.low_margin_detected': {
    category: NotificationCategory.ORDERS,
    severity: NotificationSeverity.WARNING,
    titleKey: 'notifications.events.saleLowMarginDetected.title',
    messageKey: 'notifications.events.saleLowMarginDetected.message',
    requiredPermissions: ['sales-intelligence:view-profitability'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.SalesIntelligenceRead,
    ],
  },
  'sale.missing_cost_detected': {
    category: NotificationCategory.ORDERS,
    severity: NotificationSeverity.WARNING,
    titleKey: 'notifications.events.saleMissingCostDetected.title',
    messageKey: 'notifications.events.saleMissingCostDetected.message',
    requiredPermissions: ['sales-intelligence:view-profitability'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.SalesIntelligenceRead,
    ],
  },
  'sale.stock_not_consumed': {
    category: NotificationCategory.INVENTORY,
    severity: NotificationSeverity.WARNING,
    titleKey: 'notifications.events.saleStockNotConsumed.title',
    messageKey: 'notifications.events.saleStockNotConsumed.message',
    requiredPermissions: ['sales-intelligence:read', 'inventory:read'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.SalesIntelligenceRead,
    ],
  },
  'sale.shipping_delayed': {
    category: NotificationCategory.ORDERS,
    severity: NotificationSeverity.WARNING,
    titleKey: 'notifications.events.saleShippingDelayed.title',
    messageKey: 'notifications.events.saleShippingDelayed.message',
    requiredPermissions: ['sales-intelligence:read', 'orders:read'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.SalesIntelligenceRead,
    ],
  },
  'sale.settlement_divergent': {
    category: NotificationCategory.RECONCILIATION,
    severity: NotificationSeverity.WARNING,
    titleKey: 'notifications.events.saleSettlementDivergent.title',
    messageKey: 'notifications.events.saleSettlementDivergent.message',
    requiredPermissions: ['sales-intelligence:view-settlement'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.SalesIntelligenceRead,
    ],
  },
  'sale.cash_release_blocked': {
    category: NotificationCategory.RECONCILIATION,
    severity: NotificationSeverity.ERROR,
    titleKey: 'notifications.events.saleCashReleaseBlocked.title',
    messageKey: 'notifications.events.saleCashReleaseBlocked.message',
    requiredPermissions: ['sales-intelligence:view-settlement'],
    requiredCapabilities: [
      NotificationCapabilities.Read,
      CommerceCapabilities.SalesIntelligenceRead,
    ],
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
