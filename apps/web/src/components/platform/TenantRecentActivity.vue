<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import AppCard from '../common/AppCard.vue'
import { formatDateTime } from '../../utils/date-format'

interface ActivityItem {
  id: string;
  action: string;
  label: string;
  occurredAt: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  actorType?: string;
  metadata?: any;
}

interface Props {
  activity: ActivityItem[]
}

defineProps<Props>()
const { t, currentLocale } = useI18n()

const getSeverityClass = (severity: string) => {
  if (severity === 'ERROR') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
  if (severity === 'WARNING') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
  return 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800';
}
</script>

<template>
  <AppCard>
    <template #header>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        {{ t('platform.tenants.overview.activity') }}
      </h3>
    </template>
    
    <div v-if="!activity || activity.length === 0" class="text-gray-500 text-sm text-center py-4">
      {{ t('platform.tenants.activity.empty') }}
    </div>
    
    <div v-else class="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
      <div v-for="item in activity" :key="item.id" 
           class="p-3 border rounded-md text-sm"
           :class="getSeverityClass(item.severity)">
        <div class="flex justify-between items-start mb-1">
          <span class="font-medium">{{ item.label }}</span>
          <span class="text-xs opacity-75">{{ formatDateTime(item.occurredAt, currentLocale) }}</span>
        </div>
        <div class="text-xs opacity-80" v-if="item.actorType">
          Actor: {{ item.actorType }}
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--border-color, #e5e7eb);
  border-radius: 4px;
}
</style>
