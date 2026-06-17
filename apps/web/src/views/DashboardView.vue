<template>
  <div class="lf-dashboard-container">
    <div class="lf-dashboard-hero lf-mb-8">
      <img :src="brandAssets.appHeader" alt="LedgerFlow Dashboard" class="lf-dashboard-hero-img" />
    </div>
    <AppPageHeader
      :title="t('nav.dashboard')"
      :description="t('dashboard.welcome', { name: authStore.userName })"
    >
      <template #actions>
        <AppButton variant="primary" @click="handleNewPayment">
          {{ t('dashboard.newPayment') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="lf-dashboard-grid">
      <AppCard>
        <h3>{{ t('dashboard.role') }}</h3>
        <div class="lf-card-data lf-mb-4">
          <ul class="lf-tag-list">
            <li v-for="role in authStore.roles" :key="role">
              <AppBadge variant="info">{{ role }}</AppBadge>
            </li>
          </ul>
        </div>
        
        <h3>{{ t('dashboard.permissions') }}</h3>
        <div class="lf-card-data">
          <ul class="lf-tag-list">
            <li v-for="perm in authStore.permissions" :key="perm">
              <AppBadge variant="default">{{ perm }}</AppBadge>
            </li>
          </ul>
        </div>
      </AppCard>

      <AppCard>
        <h3>{{ t('dashboard.sessionStatus') }}</h3>
        <div class="lf-card-data">
          <p class="lf-flex lf-items-center">
            <span class="lf-status-indicator lf-status-active"></span>
            {{ t('dashboard.active') }}
          </p>
          <p class="lf-text-secondary lf-mt-4" style="font-size: 0.875rem;">
            User ID: {{ authStore.user?.id }}
          </p>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import { useToastStore } from '../stores/toast.store';
import { brandAssets } from '../config/brand';

import AppCard from '../components/common/AppCard.vue';
import AppPageHeader from '../components/common/AppPageHeader.vue';
import AppBadge from '../components/common/AppBadge.vue';
import AppButton from '../components/common/AppButton.vue';

const authStore = useAuthStore();
const toastStore = useToastStore();
const { t } = useI18n();

const handleNewPayment = () => {
  toastStore.info(t('toast.actionNotImplemented'));
};
</script>

<style scoped>
.lf-dashboard-hero {
  border-radius: var(--lf-radius);
  overflow: hidden;
  border: 1px solid var(--lf-border-primary);
  max-height: 180px;
}

.lf-dashboard-hero-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  object-position: center;
}
</style>
