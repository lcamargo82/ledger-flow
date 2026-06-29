<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import AppCard from '../common/AppCard.vue'
import { formatDateTime } from '../../utils/date-format'

interface Props {
  webhooks: {
    lastReceivedAt?: string;
    processedLast24Hours: number;
    failedLast24Hours: number;
    ignoredLast24Hours: number;
  }
}

defineProps<Props>()
const { t, currentLocale } = useI18n()
</script>

<template>
  <AppCard>
    <template #header>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        {{ t('platform.tenants.overview.webhooks') }}
      </h3>
    </template>
    
    <div class="flex flex-col gap-4">
      <div v-if="webhooks.lastReceivedAt" class="text-sm">
        <span class="text-gray-500">{{ t('platform.tenants.webhooks.lastReceivedAt') }}: </span>
        <span class="font-medium text-gray-900 dark:text-white">{{ formatDateTime(webhooks.lastReceivedAt, currentLocale) }}</span>
      </div>
      <div v-else class="text-sm text-gray-500">
        {{ t('platform.tenants.webhooks.lastReceivedAt') }}: --
      </div>

      <div class="grid grid-cols-3 gap-2 text-center mt-2">
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <div class="text-2xl font-bold text-success">{{ webhooks.processedLast24Hours }}</div>
          <div class="text-xs text-gray-500 uppercase mt-1">{{ t('platform.tenants.webhooks.processedLast24Hours') }}</div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <div class="text-2xl font-bold text-danger">{{ webhooks.failedLast24Hours }}</div>
          <div class="text-xs text-gray-500 uppercase mt-1">{{ t('platform.tenants.webhooks.failedLast24Hours') }}</div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <div class="text-2xl font-bold text-gray-400">{{ webhooks.ignoredLast24Hours }}</div>
          <div class="text-xs text-gray-500 uppercase mt-1">{{ t('platform.tenants.webhooks.ignoredLast24Hours') }}</div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.text-success { color: var(--success, #10b981); }
.text-danger { color: var(--danger, #ef4444); }
</style>
