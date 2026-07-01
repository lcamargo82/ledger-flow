<template>
  <div class="lf-dashboard-container">
    <AppPageHeader
      :title="t('nav.dashboard')"
      :description="t('dashboard.welcome', { name: authStore.userName })"
    />

    <div class="lf-dashboard-hero">
      <img :src="brandAssets.appHeader" alt="LedgerFlow Dashboard" class="lf-dashboard-hero-img" />
    </div>

    <div class="lf-dashboard-grid">
      <AppCard class="lf-dashboard-card">
        <h3>{{ t('dashboard.role') }}</h3>
        <div class="lf-card-data lf-mb-5">
          <ul class="lf-tag-list">
            <li v-for="role in authStore.roles" :key="role">
              <AppBadge variant="info">{{ role }}</AppBadge>
            </li>
          </ul>
        </div>
        
        <h3>{{ t('dashboard.permissions') }}</h3>
        <div class="lf-card-data">
          <p class="lf-text-secondary">
            {{ authStore.permissions.length }} permissões ativas.
          </p>
          <div v-if="authStore.permissions.length <= 5" class="lf-mt-2">
            <ul class="lf-tag-list lf-tag-list--compact">
              <li v-for="perm in authStore.permissions" :key="perm">
                <AppBadge variant="default" class="lf-badge--small">{{ perm }}</AppBadge>
              </li>
            </ul>
          </div>
          <div v-else class="lf-mt-2">
            <AppButton variant="secondary" size="small" @click="$router.push('/permissions')">
              Ver todas as permissões
            </AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard class="lf-dashboard-card">
        <h3>{{ t('dashboard.sessionStatus') }}</h3>
        <div class="lf-card-data">
          <p class="lf-flex lf-items-center">
            <span class="lf-status-indicator lf-status-active"></span>
            <strong>{{ t('dashboard.active') }}</strong>
          </p>
          <div class="lf-session-details lf-mt-5">
            <p class="lf-text-secondary">
              <small>User ID: <br />{{ authStore.user?.id }}</small>
            </p>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import { brandAssets } from '../config/brand';

import AppCard from '../components/common/AppCard.vue';
import AppPageHeader from '../components/common/AppPageHeader.vue';
import AppBadge from '../components/common/AppBadge.vue';
import AppButton from '../components/common/AppButton.vue';

const authStore = useAuthStore();
const { t } = useI18n();
</script>

<style scoped>
.lf-dashboard-hero {
  border-radius: var(--lf-radius);
  overflow: hidden;
  border: 1px solid var(--lf-border-primary);
  height: 220px;
  background-color: var(--lf-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--lf-space-12);
}

.lf-dashboard-hero-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}

.lf-dashboard-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.lf-tag-list--compact {
  gap: 0.25rem 0.5rem;
}
.lf-badge--small {
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  opacity: 0.8;
}

.lf-session-details {
  background: rgba(255,255,255,0.02);
  padding: 1rem;
  border-radius: var(--lf-radius);
  border: 1px solid var(--lf-border-primary);
}
</style>
