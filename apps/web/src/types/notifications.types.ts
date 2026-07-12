export type NotificationCategory =
  | 'PAYMENTS'
  | 'INVENTORY'
  | 'CHANNELS'
  | 'ORDERS'
  | 'RECONCILIATION'
  | 'SYSTEM'

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

export interface NotificationItem {
  id: string
  eventType: string
  category: NotificationCategory
  severity: NotificationSeverity
  titleKey: string
  messageKey: string
  translationArgs?: Record<string, string | number | boolean | null> | null
  metadata?: Record<string, unknown> | null
  sourceId?: string | null
  readAt?: string | null
  occurredAt: string
  createdAt: string
}

export interface NotificationFilters {
  limit?: number
  cursor?: string
  category?: NotificationCategory
  severity?: NotificationSeverity
  unread?: boolean
  from?: string
  to?: string
}

export interface NotificationFeedResponse {
  data: NotificationItem[]
  meta: { nextCursor: string | null }
}
