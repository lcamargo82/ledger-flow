<template>
  <router-link
    to="/notifications"
    class="notification-bell"
    :aria-label="t('notifications.bell.label', { count: store.unreadCount })"
    :title="t('notifications.bell.label', { count: store.unreadCount })"
  >
    <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
    <span v-if="store.unreadCount" class="notification-bell__badge" aria-hidden="true">
      {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
    </span>
  </router-link>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { useNotificationsStore } from '../../stores/notifications.store'

const MINIMUM_POLLING_INTERVAL_MS = 10_000
const configuredPollingInterval = Number(
  import.meta.env.VITE_NOTIFICATIONS_POLLING_INTERVAL_MS || 30_000,
)
const POLLING_INTERVAL_MS = Math.max(
  MINIMUM_POLLING_INTERVAL_MS,
  Number.isFinite(configuredPollingInterval) ? configuredPollingInterval : 30_000,
)
const store = useNotificationsStore()
const { t } = useI18n()
let pollingId: ReturnType<typeof setInterval> | undefined

const refresh = () => void store.fetchUnreadCount().catch(() => undefined)

onMounted(() => {
  refresh()
  pollingId = setInterval(refresh, POLLING_INTERVAL_MS)
})

onUnmounted(() => {
  if (pollingId) clearInterval(pollingId)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  color: var(--lf-text-secondary);
  border-radius: var(--lf-radius);
  transition: all 0.2s;
}

.notification-bell .material-symbols-outlined {
  font-size: 20px;
}

.notification-bell:hover,
.notification-bell:focus-visible {
  color: var(--lf-text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.notification-bell__badge {
  position: absolute;
  inset-block-start: 2px;
  inset-inline-end: 2px;
  min-width: 16px;
  height: 16px;
  padding-inline: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--lf-bg-primary);
  border-radius: 999px;
  background: var(--lf-danger);
  color: white;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}
</style>
