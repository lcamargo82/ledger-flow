<script setup lang="ts">
defineProps<{
  accessibleLabel: string
}>()
</script>

<template>
  <section class="lf-metric-grid" :aria-label="accessibleLabel" data-testid="metric-grid">
    <slot />
  </section>
</template>

<style scoped>
.lf-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
  gap: var(--lf-space-4);
}

@media (max-width: 640px) {
  .lf-metric-grid > :deep(:last-child:nth-child(odd)) {
    grid-column: 1 / -1;
  }
}
</style>
