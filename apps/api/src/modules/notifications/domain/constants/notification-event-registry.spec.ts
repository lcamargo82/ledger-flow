import { NotificationCategory, NotificationSeverity } from '@prisma/client';
import {
  getNotificationEventContract,
  getVisibleNotificationEventTypes,
} from './notification-event-registry';

describe('notification event registry', () => {
  it('defines the authorized contract for a channel synchronization failure', () => {
    expect(getNotificationEventContract('channel.inventory_sync.failed')).toEqual({
      category: NotificationCategory.CHANNELS,
      severity: NotificationSeverity.ERROR,
      titleKey: 'notifications.events.channelInventorySyncFailed.title',
      messageKey: 'notifications.events.channelInventorySyncFailed.message',
      requiredPermissions: ['channels:read', 'channels:manage'],
      requiredCapabilities: ['notifications.read', 'channels.sync_inventory'],
    });
  });

  it('defines the authorized contract for channel order shipping summary updates', () => {
    expect(getNotificationEventContract('channel.order.shipping_summary.updated')).toEqual({
      category: NotificationCategory.CHANNELS,
      severity: NotificationSeverity.INFO,
      titleKey: 'notifications.events.channelOrderShippingSummaryUpdated.title',
      messageKey: 'notifications.events.channelOrderShippingSummaryUpdated.message',
      requiredPermissions: ['orders:read', 'channels:read'],
      requiredCapabilities: ['notifications.read', 'orders.manage'],
    });
  });

  it('rejects event types that are not registered', () => {
    expect(() => getNotificationEventContract('arbitrary.event')).toThrow(
      'Notification event type is not registered: arbitrary.event',
    );
  });

  it('defines the authorized contract for Mercado Pago reauthorization', () => {
    expect(getNotificationEventContract('mercado_pago.connection_reauth_required')).toEqual({
      category: NotificationCategory.PAYMENTS,
      severity: NotificationSeverity.ERROR,
      titleKey: 'notifications.events.mercadoPagoConnectionReauthRequired.title',
      messageKey: 'notifications.events.mercadoPagoConnectionReauthRequired.message',
      requiredPermissions: ['gateways:read', 'gateways:manage'],
      requiredCapabilities: ['notifications.read'],
    });
  });

  it('defines the authorized contract for Mercado Pago payment status updates', () => {
    expect(getNotificationEventContract('mercado_pago.payment_status_updated')).toEqual({
      category: NotificationCategory.PAYMENTS,
      severity: NotificationSeverity.INFO,
      titleKey: 'notifications.events.mercadoPagoPaymentStatusUpdated.title',
      messageKey: 'notifications.events.mercadoPagoPaymentStatusUpdated.message',
      requiredPermissions: ['payments:read', 'payments:manage'],
      requiredCapabilities: ['notifications.read'],
    });
  });

  it('requires current permission and every capability to expose an event type', () => {
    expect(getVisibleNotificationEventTypes(['channels:read'], ['notifications.read'])).toEqual([]);
  });

  it('exposes shipping summary notifications only to order-capable notification readers', () => {
    expect(getVisibleNotificationEventTypes(['orders:read'], ['notifications.read'])).toEqual([]);
    expect(
      getVisibleNotificationEventTypes(['orders:read'], ['notifications.read', 'orders.manage']),
    ).toContain('channel.order.shipping_summary.updated');
  });

  it('exposes Mercado Pago reauthorization notifications to gateway-capable readers', () => {
    expect(getVisibleNotificationEventTypes(['gateways:read'], [])).toEqual([]);
    expect(getVisibleNotificationEventTypes(['gateways:read'], ['notifications.read'])).toContain(
      'mercado_pago.connection_reauth_required',
    );
  });

  it('exposes Mercado Pago payment status notifications to payment-capable readers', () => {
    expect(getVisibleNotificationEventTypes(['payments:read'], ['notifications.read'])).toContain(
      'mercado_pago.payment_status_updated',
    );
  });
});
