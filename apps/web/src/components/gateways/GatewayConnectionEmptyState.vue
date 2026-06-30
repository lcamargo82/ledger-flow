<template>
  <div class="empty-state">
    <div class="i-ph-plugs-connected icon"></div>
    <h3>{{ t('gateways.empty.title') }}</h3>
    <p>{{ t('gateways.empty.description') }}</p>
    <div class="actions mt-4">
      <button class="lf-btn lf-btn-primary" @click="$emit('connect')">
        <div class="i-ph-plus"></div>
        {{ t('gateways.asaas.connect') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
defineEmits(['connect']);
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: var(--lf-panel-bg);
  border: 1px solid var(--lf-border-color);
  border-radius: var(--lf-radius-lg);
  text-align: center;
}

.empty-state .icon {
  font-size: 3rem;
  color: var(--lf-text-muted);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--lf-text-primary);
}

.empty-state p {
  margin: 0;
  color: var(--lf-text-secondary);
}
</style>
