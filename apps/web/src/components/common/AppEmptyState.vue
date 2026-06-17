<template>
  <div class="lf-empty-state">
    <div v-if="icon" class="lf-empty-state__icon">
      <!-- Optionally render an icon name if passed, or use slot -->
      <slot name="icon">
        <img :src="brandAssets.appIcon" alt="" class="lf-empty-state-icon" />
      </slot>
    </div>
    <h3 class="lf-empty-state__title">{{ title }}</h3>
    <p v-if="description" class="lf-empty-state__description">{{ description }}</p>
    <div v-if="$slots.action" class="lf-empty-state__action">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { brandAssets } from '../../config/brand';

interface Props {
  title: string;
  description?: string;
  icon?: string | boolean;
}

withDefaults(defineProps<Props>(), {
  icon: true,
});
</script>

<style scoped>
.lf-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--lf-space-8) var(--lf-space-4);
  text-align: center;
  background-color: transparent;
  border: 1px dashed var(--lf-border-primary);
  border-radius: var(--lf-radius);
}

.lf-empty-state__icon {
  margin-bottom: var(--lf-space-4);
  opacity: 0.7;
}

.lf-empty-state-icon {
  width: 3.5rem;
  height: 3.5rem;
  object-fit: contain;
}

.lf-empty-state__title {
  margin: 0 0 var(--lf-space-2) 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-empty-state__description {
  margin: 0;
  color: var(--lf-text-secondary);
  font-size: 0.9375rem;
  max-width: 400px;
}

.lf-empty-state__action {
  margin-top: var(--lf-space-6);
}
</style>
