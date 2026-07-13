import { httpClient } from './http-client'
import type {
  NotificationFeedResponse,
  NotificationFilters,
} from '../types/notifications.types'

export class NotificationsService {
  async list(params?: NotificationFilters): Promise<NotificationFeedResponse> {
    const { data } = await httpClient.get<NotificationFeedResponse>('/notifications', { params })
    return data
  }

  async unreadCount(): Promise<number> {
    const { data } = await httpClient.get<{ count: number }>('/notifications/unread-count')
    return data.count
  }

  async markRead(id: string): Promise<void> {
    await httpClient.patch(`/notifications/${id}/read`)
  }

  async markAllRead(): Promise<void> {
    await httpClient.post('/notifications/read-all')
  }

  async dismiss(id: string): Promise<void> {
    await httpClient.delete(`/notifications/${id}`)
  }
}

export const notificationsService = new NotificationsService()
