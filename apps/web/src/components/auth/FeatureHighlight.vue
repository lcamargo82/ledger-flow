<template>
  <div class="lf-feature-highlight">
    <div class="lf-feature-icon-wrapper">
      <component :is="icon" class="lf-feature-icon" />
    </div>
    <div class="lf-feature-content">
      <h3 class="lf-feature-title">{{ title }}</h3>
      <p class="lf-feature-desc">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Component } from 'vue';

defineProps<{
  icon: Component;
  title: string;
  description: string;
}>();
</script>

<style scoped>
.lf-feature-highlight {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.lf-feature-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(6, 182, 212, 0.1); /* Cyan based subtle background */
  border: 1px solid rgba(6, 182, 212, 0.2);
  color: var(--lf-cyan);
  flex-shrink: 0;
  box-shadow: inset 0 0 10px rgba(6, 182, 212, 0.05);
}

.lf-feature-icon {
  width: 24px;
  height: 24px;
}

.lf-feature-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lf-feature-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--lf-text-primary);
  line-height: 1.4;
}

.lf-feature-desc {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--lf-text-secondary);
  line-height: 1.5;
}
</style>
