<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import AppCard from '../common/AppCard.vue';
import AppBadge from '../common/AppBadge.vue';
import AppButton from '../common/AppButton.vue';
import { useRouter } from 'vue-router';
import type { PlatformTenantSupportSummary } from '../../types/platform-audit.types';

const props = defineProps<{
  summary: PlatformTenantSupportSummary;
}>();

const { t } = useI18n();
const router = useRouter();

const healthIcon = computed(() => {
  switch (props.summary.support.healthStatus) {
    case 'CRITICAL': return 'cancel';
    case 'WARNING': return 'warning';
    case 'HEALTHY': return 'check_circle';
    default: return 'warning';
  }
});

const healthColor = computed(() => {
  switch (props.summary.support.healthStatus) {
    case 'CRITICAL': return 'text-red-500';
    case 'WARNING': return 'text-amber-500';
    case 'HEALTHY': return 'text-emerald-500';
    default: return 'text-slate-400';
  }
});

const healthVariant = computed(() => {
  switch (props.summary.support.healthStatus) {
    case 'CRITICAL': return 'danger';
    case 'WARNING': return 'warning';
    case 'HEALTHY': return 'success';
    default: return 'default';
  }
});

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
};

const goToAudit = () => {
  router.push({
    name: 'PlatformAudit',
    query: { tenantId: props.summary.tenant.id }
  });
};
</script>

<template>
  <div class="lf-support-grid">
    <!-- Health Overview -->
    <AppCard>
      <div class="lf-health-header">
        <span class="material-symbols-outlined lf-health-icon" :class="healthColor">{{ healthIcon }}</span>
        <div>
          <h3 class="lf-card-title">{{ t('platform.support.health') }}</h3>
          <AppBadge :variant="healthVariant" class="lf-mt-1">
            {{ props.summary.support.healthStatus }}
          </AppBadge>
        </div>
      </div>
      
      <div class="lf-health-stats">
        <div class="lf-health-stat">
          <span class="lf-stat-label">{{ t('platform.support.recentCriticalEvents') }}</span>
          <span class="lf-stat-value" :class="{'lf-text-danger': props.summary.support.recentCriticalEvents > 0}">
            {{ props.summary.support.recentCriticalEvents }}
          </span>
        </div>
        <div class="lf-health-stat">
          <span class="lf-stat-label">{{ t('platform.support.recentWarnings') }}</span>
          <span class="lf-stat-value" :class="{'lf-text-warning': props.summary.support.recentWarnings > 0}">
            {{ props.summary.support.recentWarnings }}
          </span>
        </div>
        <div class="lf-health-stat">
          <span class="lf-stat-label">{{ t('platform.support.recentWebhookFailures') }}</span>
          <span class="lf-stat-value" :class="{'lf-text-danger': props.summary.support.recentWebhookFailures > 0}">
            {{ props.summary.support.recentWebhookFailures }}
          </span>
        </div>
      </div>
    </AppCard>

    <!-- Operational Details -->
    <AppCard>
      <h3 class="lf-card-title lf-mb-4">{{ t('platform.support.title') }}</h3>
      <div class="lf-health-stats">
        <div class="lf-health-stat">
          <span class="lf-stat-label">{{ t('platform.support.lastSuccessfulWebhookAt') }}</span>
          <span class="lf-stat-value">{{ formatDate(props.summary.support.lastSuccessfulWebhookAt) }}</span>
        </div>
        <div class="lf-health-stat">
          <span class="lf-stat-label">{{ t('platform.support.lastPaymentStatusChangeAt') }}</span>
          <span class="lf-stat-value">{{ formatDate(props.summary.support.lastPaymentStatusChangeAt) }}</span>
        </div>
        <div class="lf-health-stat">
          <span class="lf-stat-label">{{ t('platform.support.lastOwnerLoginAt') }}</span>
          <span class="lf-stat-value">{{ formatDate(props.summary.support.lastOwnerLoginAt) }}</span>
        </div>
        <div class="lf-health-stat">
          <span class="lf-stat-label">{{ t('platform.support.pendingInvitation') }}</span>
          <span class="lf-stat-value">{{ props.summary.support.pendingInvitation ? t('common.yes') : t('common.no') }}</span>
        </div>
      </div>
      
      <div class="lf-card-actions">
        <AppButton variant="secondary" class="lf-w-full" @click="goToAudit">
          {{ t('platform.audit.actions.viewAllTenantLogs') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Recommended Actions -->
    <AppCard>
      <h3 class="lf-card-title lf-mb-4">{{ t('platform.support.recommendedActions') }}</h3>
      
      <div v-if="props.summary.recommendedActions.length > 0" class="lf-recommendation-list">
        <div v-for="action in props.summary.recommendedActions" :key="action" class="lf-recommendation-item">
          <span class="material-symbols-outlined lf-recommendation-icon" style="font-size: 20px;">warning</span>
          <span class="lf-recommendation-text">{{ t(`platform.support.recommendation.${action}`) }}</span>
        </div>
      </div>
      <div v-else class="lf-recommendation-empty">
        <span class="material-symbols-outlined lf-recommendation-empty-icon" style="font-size: 32px;">check_circle</span>
        <p class="lf-recommendation-empty-text">{{ t('platform.support.noRecommendedActions') }}</p>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
.lf-support-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--lf-space-6);
  margin-bottom: var(--lf-space-6);
}

@media (min-width: 1024px) {
  .lf-support-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.lf-card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-health-header {
  display: flex;
  align-items: center;
  gap: var(--lf-space-3);
  margin-bottom: var(--lf-space-4);
}

.lf-health-icon {
  font-size: 1.875rem;
}

.lf-health-stats {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-3);
  margin-top: var(--lf-space-6);
}

.lf-health-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lf-stat-label {
  font-size: 0.875rem;
  color: var(--lf-text-secondary);
}

.lf-stat-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-text-danger { color: var(--lf-danger); }
.lf-text-warning { color: var(--lf-warning); }
.lf-text-success { color: var(--lf-success); }

.lf-card-actions {
  margin-top: var(--lf-space-6);
  padding-top: var(--lf-space-4);
  border-top: 1px solid var(--lf-border-primary);
  text-align: center;
}

.lf-recommendation-list {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-2);
}

.lf-recommendation-item {
  display: flex;
  align-items: flex-start;
  padding: var(--lf-space-3);
  background-color: var(--lf-surface-secondary);
  border-radius: var(--lf-radius);
  border: 1px solid var(--lf-border-primary);
}

.lf-recommendation-icon {
  color: var(--lf-warning);
  margin-right: var(--lf-space-2);
  flex-shrink: 0;
  margin-top: 2px;
}

.lf-recommendation-text {
  font-size: 0.875rem;
  color: var(--lf-text-primary);
}

.lf-recommendation-empty {
  text-align: center;
  padding: var(--lf-space-6);
  color: var(--lf-text-secondary);
}

.lf-recommendation-empty-icon {
  color: var(--lf-success);
  margin-bottom: var(--lf-space-2);
  display: block;
}

.lf-recommendation-empty-text {
  font-size: 0.875rem;
  margin: 0;
}
</style>
