<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import AppCard from '../common/AppCard.vue'
import AppBadge from '../common/AppBadge.vue'
import { formatDateTime } from '../../utils/date-format'

interface Provider {
  provider: string;
  environment: string;
  status: string;
  healthStatus: string;
  lastHealthCheckAt?: string;
}

interface Props {
  gateway: {
    hasActiveConfiguration: boolean;
    activeProviders: Provider[];
  }
}

defineProps<Props>()
const { t, currentLocale } = useI18n()
</script>

<template>
  <AppCard>
    <template #header>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        {{ t('platform.tenants.overview.gateway') }}
      </h3>
    </template>
    
    <div v-if="!gateway.hasActiveConfiguration" class="text-gray-500 text-sm text-center py-4">
      {{ t('platform.tenants.gateway.noActiveConfiguration') }}
    </div>
    
    <div v-else class="space-y-4">
      <div v-for="provider in gateway.activeProviders" :key="`${provider.provider}-${provider.environment}`" class="provider-card p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-start mb-2">
          <div class="font-medium text-gray-900 dark:text-white">{{ provider.provider }}</div>
          <AppBadge :variant="provider.environment === 'PRODUCTION' ? 'success' : 'warning'">
            {{ provider.environment }}
          </AppBadge>
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-sm mt-4">
          <div>
            <span class="text-gray-500">{{ t('platform.tenants.gateway.status') }}: </span>
            <span class="font-medium">{{ provider.status }}</span>
          </div>
          <div>
            <span class="text-gray-500">{{ t('platform.tenants.gateway.healthStatus') }}: </span>
            <AppBadge :variant="provider.healthStatus === 'HEALTHY' ? 'success' : provider.healthStatus === 'UNKNOWN' ? 'default' : 'danger'">
              {{ provider.healthStatus }}
            </AppBadge>
          </div>
          <div class="col-span-2 text-xs text-gray-500 mt-2" v-if="provider.lastHealthCheckAt">
            {{ t('platform.tenants.gateway.lastHealthCheck') }}: {{ formatDateTime(provider.lastHealthCheckAt, currentLocale) }}
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>
