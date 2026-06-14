<template>
  <div class="lf-error-state">
    <div class="lf-error-state__icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-large">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
      </svg>
    </div>
    <h3 class="lf-error-state__title">{{ title }}</h3>
    <p v-if="description" class="lf-error-state__description">{{ description }}</p>
    <div v-if="showRetry || $slots.action" class="lf-error-state__action">
      <slot name="action">
        <AppButton v-if="showRetry" variant="secondary" @click="$emit('retry')">
          {{ actionLabel || t('common.tryAgain') }}
        </AppButton>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import AppButton from './AppButton.vue';

interface Props {
  title: string;
  description?: string;
  actionLabel?: string;
  showRetry?: boolean;
}

withDefaults(defineProps<Props>(), {
  showRetry: false,
});

defineEmits<{
  (e: 'retry'): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
.lf-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--lf-space-8) var(--lf-space-4);
  text-align: center;
  background-color: var(--lf-danger-bg);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--lf-radius);
}

.lf-error-state__icon {
  color: var(--lf-danger);
  margin-bottom: var(--lf-space-4);
}

.icon-large {
  width: 3rem;
  height: 3rem;
}

.lf-error-state__title {
  margin: 0 0 var(--lf-space-2) 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--lf-danger);
}

.lf-error-state__description {
  margin: 0;
  color: var(--lf-text-primary);
  font-size: 0.9375rem;
  max-width: 400px;
}

.lf-error-state__action {
  margin-top: var(--lf-space-6);
}
</style>
