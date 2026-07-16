<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useNotificationsStore } from '../stores/notifications.store'
import type { NotificationCategory, NotificationItem } from '../types/notifications.types'
import { formatDateTime } from '../utils/date-format'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppEmptyState from '../components/common/AppEmptyState.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppLoading from '../components/common/AppLoading.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'

const store = useNotificationsStore()
const { t, currentLocale } = useI18n()
const filters = reactive<{ category: '' | NotificationCategory; unread: string }>({
  category: '',
  unread: '',
})

const categoryOptions = computed(() => [
  { value: '', label: t('notifications.filters.allCategories') },
  ...(['PAYMENTS', 'INVENTORY', 'CHANNELS', 'ORDERS', 'RECONCILIATION', 'SYSTEM'] as const).map(
    (category) => ({ value: category, label: t(`notifications.categories.${category}`) }),
  ),
])
const unreadOptions = computed(() => [
  { value: '', label: t('notifications.filters.allStatuses') },
  { value: 'true', label: t('notifications.filters.unreadOnly') },
])
const requestFilters = computed(() => ({
  limit: 20,
  category: filters.category || undefined,
  unread: filters.unread === 'true' || undefined,
}))

const translateArgs = (item: NotificationItem) => {
  const entries = Object.entries(item.translationArgs || {}).flatMap(([key, value]) => {
    if (typeof value === 'string' && value.toUpperCase() === 'UNKNOWN') {
      return [[key, t('notifications.fallbacks.unavailable')] as const]
    }
    if (typeof value === 'string' || typeof value === 'number') return [[key, value] as const]
    if (value === null) return [[key, t('notifications.fallbacks.unavailable')] as const]
    return []
  })
  return Object.fromEntries(entries)
}
const translateNotification = (key: string, item: NotificationItem) =>
  t(key, translateArgs(item)).replace(/\{[^{}]+\}/g, t('notifications.fallbacks.unavailable'))
const severityVariant = (item: NotificationItem) =>
  ({ INFO: 'info', SUCCESS: 'success', WARNING: 'warning', ERROR: 'danger' })[item.severity] as
    | 'info'
    | 'success'
    | 'warning'
    | 'danger'
const refresh = () => Promise.all([store.fetchFeed(requestFilters.value), store.fetchUnreadCount()])
const safeRefresh = () => void refresh().catch(() => undefined)

onMounted(safeRefresh)
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader :title="t('notifications.title')" :description="t('notifications.description')">
      <template #actions>
        <AppButton
          variant="secondary"
          :loading="store.isMutating"
          :disabled="store.unreadCount === 0"
          @click="store.markAllRead"
        >
          {{ t('notifications.actions.markAllRead') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppCard>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AppSelect
          v-model="filters.category"
          :label="t('notifications.filters.category')"
          :options="categoryOptions"
          @update:model-value="safeRefresh"
        />
        <AppSelect
          v-model="filters.unread"
          :label="t('notifications.filters.status')"
          :options="unreadOptions"
          @update:model-value="safeRefresh"
        />
      </div>
    </AppCard>

    <AppErrorState
      v-if="store.error"
      :title="t('notifications.errors.title')"
      :description="t(store.error)"
      show-retry
      @retry="safeRefresh"
    />
    <AppLoading v-else-if="store.isLoading && !store.items.length" />
    <AppEmptyState
      v-else-if="!store.items.length"
      :title="t('notifications.empty.title')"
      :description="t('notifications.empty.description')"
    />
    <div v-else class="space-y-3" aria-live="polite">
      <article
        v-for="item in store.items"
        :key="item.id"
        class="notification-item"
        :class="{ 'notification-item--unread': !item.readAt }"
      >
        <div class="notification-item__content">
          <div class="flex flex-wrap items-center gap-2">
            <AppBadge :variant="severityVariant(item)">
              {{ t(`notifications.severity.${item.severity}`) }}
            </AppBadge>
            <span class="text-xs text-muted">{{ t(`notifications.categories.${item.category}`) }}</span>
          </div>
          <h2 class="notification-item__title">{{ translateNotification(item.titleKey, item) }}</h2>
          <p class="notification-item__message">{{ translateNotification(item.messageKey, item) }}</p>
          <time class="text-xs text-muted" :datetime="item.occurredAt">
            {{ formatDateTime(item.occurredAt, currentLocale) }}
          </time>
        </div>
        <div class="notification-item__actions">
          <AppButton v-if="!item.readAt" size="small" variant="secondary" @click="store.markRead(item.id)">
            {{ t('notifications.actions.markRead') }}
          </AppButton>
          <AppButton size="small" variant="secondary" @click="store.dismiss(item.id)">
            {{ t('notifications.actions.dismiss') }}
          </AppButton>
        </div>
      </article>
      <div v-if="store.hasMore" class="flex justify-center pt-2">
        <AppButton variant="secondary" :loading="store.isLoading" @click="store.loadMore(requestFilters)">
          {{ t('notifications.actions.loadMore') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--lf-space-4);
  padding: var(--lf-space-5);
  border: 1px solid var(--lf-border-primary);
  border-inline-start: 3px solid transparent;
  border-radius: var(--lf-radius);
  background: var(--lf-surface-primary);
}
.notification-item--unread { border-inline-start-color: var(--lf-primary); }
.notification-item__content { min-width: 0; }
.notification-item__title { margin: var(--lf-space-2) 0 0; font-size: 1rem; font-weight: 600; }
.notification-item__message { margin: var(--lf-space-1) 0 var(--lf-space-2); color: var(--lf-text-secondary); }
.notification-item__actions { display: flex; flex-shrink: 0; gap: var(--lf-space-2); }
.text-muted { color: var(--lf-text-muted); }
@media (max-width: 640px) {
  .notification-item { flex-direction: column; }
  .notification-item__actions { width: 100%; flex-wrap: wrap; }
}
</style>
