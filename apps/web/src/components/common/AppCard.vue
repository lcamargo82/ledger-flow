<template>
  <div class="lf-card">
    <div v-if="$slots.header" class="lf-card__header">
      <slot name="header" />
    </div>
    <div class="lf-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="lf-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Simple wrapper
</script>

<style scoped>
.lf-card__header {
  margin-bottom: var(--lf-space-4);
  padding-bottom: var(--lf-space-4);
  border-bottom: 1px solid var(--lf-border-primary);
}
.lf-card__footer {
  margin-top: var(--lf-space-4);
  padding-top: var(--lf-space-4);
  border-top: 1px solid var(--lf-border-primary);
}
</style>
