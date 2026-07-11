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
      <h3 class="lf-card-title">
        {{ t('platform.tenants.overview.operations') }}
      </h3>
    </template>
    
    <div class="lf-metrics-grid">
      <div class="lf-metric-group">
        <h4 class="lf-metric-title">{{ t('platform.tenants.metrics.usersTitle') }}</h4>
        <div class="lf-metric-list">
          <div class="lf-metric-item">
            <span class="lf-metric-label">{{ t('platform.tenants.metrics.usersTotal') }}</span>
            <span class="lf-metric-value">{{ metrics.usersTotal }}</span>
          </div>
          <div class="lf-metric-item">
            <span class="lf-metric-label">{{ t('platform.tenants.metrics.usersActive') }}</span>
            <span class="lf-metric-value lf-text-success">{{ metrics.usersActive }}</span>
          </div>
        </div>
      </div>

      <div class="lf-metric-group">
        <h4 class="lf-metric-title">{{ t('platform.tenants.metrics.customersTitle') }}</h4>
        <div class="lf-metric-list">
          <div class="lf-metric-item">
            <span class="lf-metric-label">{{ t('platform.tenants.metrics.customersTotal') }}</span>
            <span class="lf-metric-value">{{ metrics.customersTotal }}</span>
          </div>
          <div class="lf-metric-item">
            <span class="lf-metric-label">{{ t('platform.tenants.metrics.customersActive') }}</span>
            <span class="lf-metric-value lf-text-success">{{ metrics.customersActive }}</span>
          </div>
        </div>
      </div>

      <div class="lf-metric-group">
        <h4 class="lf-metric-title">{{ t('platform.tenants.metrics.paymentsTitle') }}</h4>
        <div class="lf-metric-list">
          <div class="lf-metric-item">
            <span class="lf-metric-label">{{ t('platform.tenants.metrics.paymentsTotal') }}</span>
            <span class="lf-metric-value">{{ metrics.paymentsTotal }}</span>
          </div>
          <div class="lf-metric-item">
            <span class="lf-metric-label">{{ t('platform.tenants.metrics.paymentsPending') }}</span>
            <span class="lf-metric-value lf-text-warning">{{ metrics.paymentsPending }}</span>
          </div>
          <div class="lf-metric-item">
            <span class="lf-metric-label">{{ t('platform.tenants.metrics.paymentsFailed') }}</span>
            <span class="lf-metric-value lf-text-danger">{{ metrics.paymentsFailed }}</span>
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

.lf-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--lf-space-6);
}

.lf-metric-group {
  display: flex;
  flex-direction: column;
}

.lf-metric-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lf-text-muted);
  border-bottom: 1px solid var(--lf-border-primary);
  padding-bottom: var(--lf-space-2);
  margin: 0 0 var(--lf-space-3) 0;
}

.lf-metric-list {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-2);
}

.lf-metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lf-metric-label {
  font-size: 0.875rem;
  color: var(--lf-text-secondary);
}

.lf-metric-value {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-text-success { color: var(--lf-success); }
.lf-text-warning { color: var(--lf-warning); }
.lf-text-danger { color: var(--lf-danger); }
</style>
