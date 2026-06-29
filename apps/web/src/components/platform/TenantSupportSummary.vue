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
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <!-- Health Overview -->
    <AppCard>
      <div class="flex items-center space-x-3 mb-4">
        <span class="material-symbols-outlined text-3xl" :class="healthColor">{{ healthIcon }}</span>
        <div>
          <h3 class="text-lg font-medium text-slate-900">{{ t('platform.support.health') }}</h3>
          <AppBadge :variant="healthVariant" class="mt-1">
            {{ props.summary.support.healthStatus }}
          </AppBadge>
        </div>
      </div>
      
      <div class="space-y-3 mt-6">
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500">{{ t('platform.support.recentCriticalEvents') }}</span>
          <span class="font-medium text-slate-900" :class="{'text-red-600': props.summary.support.recentCriticalEvents > 0}">
            {{ props.summary.support.recentCriticalEvents }}
          </span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500">{{ t('platform.support.recentWarnings') }}</span>
          <span class="font-medium text-slate-900" :class="{'text-amber-600': props.summary.support.recentWarnings > 0}">
            {{ props.summary.support.recentWarnings }}
          </span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500">{{ t('platform.support.recentWebhookFailures') }}</span>
          <span class="font-medium text-slate-900" :class="{'text-red-600': props.summary.support.recentWebhookFailures > 0}">
            {{ props.summary.support.recentWebhookFailures }}
          </span>
        </div>
      </div>
    </AppCard>

    <!-- Operational Details -->
    <AppCard>
      <h3 class="text-lg font-medium text-slate-900 mb-4">{{ t('platform.support.title') }}</h3>
      <div class="space-y-3">
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500">{{ t('platform.support.lastSuccessfulWebhookAt') }}</span>
          <span class="font-medium text-slate-900">{{ formatDate(props.summary.support.lastSuccessfulWebhookAt) }}</span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500">{{ t('platform.support.lastPaymentStatusChangeAt') }}</span>
          <span class="font-medium text-slate-900">{{ formatDate(props.summary.support.lastPaymentStatusChangeAt) }}</span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500">{{ t('platform.support.lastOwnerLoginAt') }}</span>
          <span class="font-medium text-slate-900">{{ formatDate(props.summary.support.lastOwnerLoginAt) }}</span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-slate-500">{{ t('platform.support.pendingInvitation') }}</span>
          <span class="font-medium text-slate-900">{{ props.summary.support.pendingInvitation ? t('common.yes') : t('common.no') }}</span>
        </div>
      </div>
      
      <div class="mt-6 pt-4 border-t border-slate-100 text-center">
        <AppButton variant="secondary" class="w-full" @click="goToAudit">
          {{ t('platform.audit.actions.viewAllTenantLogs') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Recommended Actions -->
    <AppCard>
      <h3 class="text-lg font-medium text-slate-900 mb-4">{{ t('platform.support.recommendedActions') }}</h3>
      
      <div v-if="props.summary.recommendedActions.length > 0" class="space-y-2">
        <div v-for="action in props.summary.recommendedActions" :key="action" class="flex items-start p-3 bg-slate-50 rounded-md border border-slate-200">
          <span class="material-symbols-outlined text-amber-500 mr-2 flex-shrink-0 mt-0.5" style="font-size: 20px;">warning</span>
          <span class="text-sm text-slate-800">{{ t(`platform.support.recommendation.${action}`) }}</span>
        </div>
      </div>
      <div v-else class="text-center p-6 text-slate-500">
        <span class="material-symbols-outlined mx-auto text-emerald-400 mb-2" style="font-size: 32px;">check_circle</span>
        <p class="text-sm">{{ t('platform.support.noRecommendedActions') }}</p>
      </div>
    </AppCard>
  </div>
</template>
