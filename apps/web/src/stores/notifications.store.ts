import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { notificationsService } from '../services/notifications.service'
import type { NotificationFilters, NotificationItem } from '../types/notifications.types'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const nextCursor = ref<string | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)
  const hasMore = computed(() => Boolean(nextCursor.value))

  const fetchUnreadCount = async () => {
    unreadCount.value = await notificationsService.unreadCount()
  }

  const fetchFeed = async (filters: NotificationFilters = {}) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await notificationsService.list({ ...filters, cursor: undefined })
      items.value = response.data
      nextCursor.value = response.meta.nextCursor
    } catch (cause) {
      error.value = 'notifications.errors.load'
      throw cause
    } finally {
      isLoading.value = false
    }
  }

  const loadMore = async (filters: NotificationFilters = {}) => {
    if (!nextCursor.value || isLoading.value) return
    isLoading.value = true
    try {
      const response = await notificationsService.list({
        ...filters,
        cursor: nextCursor.value,
      })
      items.value.push(...response.data)
      nextCursor.value = response.meta.nextCursor
    } finally {
      isLoading.value = false
    }
  }

  const markRead = async (id: string) => {
    const notification = items.value.find((item) => item.id === id)
    if (!notification || notification.readAt) return
    await notificationsService.markRead(id)
    notification.readAt = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  const markAllRead = async () => {
    isMutating.value = true
    try {
      await notificationsService.markAllRead()
      const readAt = new Date().toISOString()
      items.value.forEach((item) => (item.readAt = item.readAt ?? readAt))
      unreadCount.value = 0
    } finally {
      isMutating.value = false
    }
  }

  const dismiss = async (id: string) => {
    const notification = items.value.find((item) => item.id === id)
    await notificationsService.dismiss(id)
    items.value = items.value.filter((item) => item.id !== id)
    if (notification && !notification.readAt) {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  return {
    items,
    unreadCount,
    nextCursor,
    hasMore,
    isLoading,
    isMutating,
    error,
    fetchUnreadCount,
    fetchFeed,
    loadMore,
    markRead,
    markAllRead,
    dismiss,
  }
})
