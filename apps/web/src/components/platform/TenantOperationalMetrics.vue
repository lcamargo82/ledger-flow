<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import AppCard from '../common/AppCard.vue'

interface Props {
  metrics: {
    usersTotal: number;
    usersActive: number;
    customersTotal: number;
    customersActive: number;
    paymentsTotal: number;
    paymentsPending: number;
    paymentsFailed: number;
  }
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <AppCard>
    <template #header>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        {{ t('platform.tenants.overview.operations') }}
      </h3>
    </template>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="metric-group">
        <h4 class="metric-title">{{ t('platform.tenants.metrics.usersTitle') }}</h4>
        <div class="flex flex-col gap-2 mt-2">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('platform.tenants.metrics.usersTotal') }}</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ metrics.usersTotal }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('platform.tenants.metrics.usersActive') }}</span>
            <span class="font-medium text-success">{{ metrics.usersActive }}</span>
          </div>
        </div>
      </div>

      <div class="metric-group">
        <h4 class="metric-title">{{ t('platform.tenants.metrics.customersTitle') }}</h4>
        <div class="flex flex-col gap-2 mt-2">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('platform.tenants.metrics.customersTotal') }}</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ metrics.customersTotal }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('platform.tenants.metrics.customersActive') }}</span>
            <span class="font-medium text-success">{{ metrics.customersActive }}</span>
          </div>
        </div>
      </div>

      <div class="metric-group">
        <h4 class="metric-title">{{ t('platform.tenants.metrics.paymentsTitle') }}</h4>
        <div class="flex flex-col gap-2 mt-2">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('platform.tenants.metrics.paymentsTotal') }}</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ metrics.paymentsTotal }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('platform.tenants.metrics.paymentsPending') }}</span>
            <span class="font-medium text-warning">{{ metrics.paymentsPending }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('platform.tenants.metrics.paymentsFailed') }}</span>
            <span class="font-medium text-danger">{{ metrics.paymentsFailed }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.metric-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary, #6b7280);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  padding-bottom: 0.5rem;
}
.text-success { color: var(--success, #10b981); }
.text-warning { color: var(--warning, #f59e0b); }
.text-danger { color: var(--danger, #ef4444); }
</style>
