import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import enUS from '../locales/en-US.json'
import ptBR from '../locales/pt-BR.json'
import { notificationsService } from '../services/notifications.service'
import { useNotificationsStore } from '../stores/notifications.store'

vi.mock('../services/notifications.service', () => ({
  notificationsService: {
    list: vi.fn<typeof notificationsService.list>(),
    unreadCount: vi.fn<typeof notificationsService.unreadCount>(),
    markRead: vi.fn<typeof notificationsService.markRead>(),
    markAllRead: vi.fn<typeof notificationsService.markAllRead>(),
    dismiss: vi.fn<typeof notificationsService.dismiss>(),
  },
}))

describe('notification center translations', () => {
  it('defines equivalent PT-BR and EN-US user-facing contracts', () => {
    expect(ptBR.notifications.actions.markAllRead).toBe('Marcar todas como lidas')
    expect(enUS.notifications.actions.markAllRead).toBe('Mark all as read')
    expect(ptBR.notifications.events.channelInventorySyncFailed.title).toBeTruthy()
    expect(enUS.notifications.events.channelInventorySyncFailed.title).toBeTruthy()
  })
})

describe('notifications store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps feed and unread count synchronized after marking all as read', async () => {
    vi.mocked(notificationsService.markAllRead).mockResolvedValue()
    const store = useNotificationsStore()
    store.items = [
      {
        id: 'recipient-1',
        eventType: 'channel.inventory_sync.failed',
        category: 'CHANNELS',
        severity: 'ERROR',
        titleKey: 'notifications.events.channelInventorySyncFailed.title',
        messageKey: 'notifications.events.channelInventorySyncFailed.message',
        readAt: null,
        occurredAt: '2026-07-11T20:00:00.000Z',
        createdAt: '2026-07-11T20:00:00.000Z',
      },
    ]
    store.unreadCount = 1

    await store.markAllRead()

    expect(store.unreadCount).toBe(0)
    expect(store.items[0]?.readAt).toBeTruthy()
  })

  it('does not fetch another page without a cursor', async () => {
    const store = useNotificationsStore()

    await store.loadMore()

    expect(notificationsService.list).not.toHaveBeenCalled()
  })
})
