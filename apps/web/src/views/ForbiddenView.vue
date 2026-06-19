<template>
  <div class="lf-error-view">
    <div class="lf-error-card">
      <img :src="brandAssets.appIcon" alt="LedgerFlow" class="lf-error-icon" />
      <h1 class="lf-error-title">403</h1>
      <h2 class="lf-mb-4" style="font-size: 1.5rem; font-weight: 600;">{{ t('errors.forbiddenTitle') }}</h2>
      <p class="lf-error-description">
        {{ t('errors.forbiddenMessage') }}
      </p>
      <router-link to="/">
        <AppButton variant="primary">{{ t('common.goToDashboard') }}</AppButton>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../components/common/AppButton.vue';
import { brandAssets } from '../config/brand';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
</script>

<style scoped>
.lf-error-icon {
  width: 4rem;
  height: 4rem;
  margin-bottom: var(--lf-space-6);
  opacity: 0.8;
}
</style>
