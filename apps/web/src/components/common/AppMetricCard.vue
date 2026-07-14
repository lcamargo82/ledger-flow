<script setup lang="ts">
import AppCard from './AppCard.vue'

defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <AppCard data-testid="metric-card">
    <p class="lf-metric-card__label">{{ label }}</p>
    <p class="lf-metric-card__value">{{ value }}</p>
  </AppCard>
</template>

<style scoped>
.lf-metric-card__label {
  font-size: 0.8125rem;
  color: var(--lf-text-secondary);
}

.lf-metric-card__value {
  margin-top: var(--lf-space-2);
  font-size: 1.35rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--lf-text-primary);
}
</style>
