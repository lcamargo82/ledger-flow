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

  it('rejects event types that are not registered', () => {
    expect(() => getNotificationEventContract('arbitrary.event')).toThrow(
      'Notification event type is not registered: arbitrary.event',
    );
  });

  it('requires current permission and every capability to expose an event type', () => {
    expect(getVisibleNotificationEventTypes(['channels:read'], ['notifications.read'])).toEqual([]);
  });
});
