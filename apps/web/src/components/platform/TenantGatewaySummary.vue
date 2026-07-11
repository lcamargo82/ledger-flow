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
      <h3 class="lf-card-title">
        {{ t('platform.tenants.overview.gateway') }}
      </h3>
    </template>
    
    <div v-if="!gateway.hasActiveConfiguration" class="lf-empty-state text-center py-4">
      {{ t('platform.tenants.gateway.noActiveConfiguration') }}
    </div>
    
    <div v-else class="lf-provider-list">
      <div v-for="provider in gateway.activeProviders" :key="`${provider.provider}-${provider.environment}`" class="lf-provider-card">
        <div class="lf-provider-header">
          <div class="lf-provider-name">{{ provider.provider }}</div>
          <AppBadge :variant="provider.environment === 'PRODUCTION' ? 'success' : 'warning'">
            {{ provider.environment }}
          </AppBadge>
        </div>
        
        <div class="lf-provider-details">
          <div class="lf-provider-detail">
            <span class="lf-provider-label">{{ t('platform.tenants.gateway.status') }}: </span>
            <span class="lf-provider-value">{{ provider.status }}</span>
          </div>
          <div class="lf-provider-detail">
            <span class="lf-provider-label">{{ t('platform.tenants.gateway.healthStatus') }}: </span>
            <AppBadge :variant="provider.healthStatus === 'HEALTHY' ? 'success' : provider.healthStatus === 'UNKNOWN' ? 'default' : 'danger'">
              {{ provider.healthStatus }}
            </AppBadge>
          </div>
          <div class="lf-provider-footer" v-if="provider.lastHealthCheckAt">
            {{ t('platform.tenants.gateway.lastHealthCheck') }}: {{ formatDateTime(provider.lastHealthCheckAt, currentLocale) }}
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.lf-card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-empty-state {
  color: var(--lf-text-secondary);
  font-size: 0.875rem;
}

.lf-provider-list {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

.lf-provider-card {
  padding: var(--lf-space-4);
  border-radius: var(--lf-radius);
  background-color: var(--lf-bg-secondary);
  border: 1px solid var(--lf-border-primary);
}

.lf-provider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--lf-space-2);
}

.lf-provider-name {
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-provider-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--lf-space-2);
  margin-top: var(--lf-space-4);
}

.lf-provider-detail {
  display: flex;
  align-items: center;
  gap: var(--lf-space-2);
}

.lf-provider-label {
  font-size: 0.875rem;
  color: var(--lf-text-secondary);
}

.lf-provider-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-provider-footer {
  grid-column: span 2;
  font-size: 0.75rem;
  color: var(--lf-text-muted);
  margin-top: var(--lf-space-2);
}
</style>
