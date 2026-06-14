<template>
  <header class="lf-page-header">
    <div class="lf-page-header__content">
      <div v-if="eyebrow" class="lf-page-header__eyebrow">{{ eyebrow }}</div>
      <h1 class="lf-page-header__title">{{ title }}</h1>
      <p v-if="description" class="lf-page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="lf-page-header__actions">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
  eyebrow?: string;
}

defineProps<Props>();
</script>

<style scoped>
.lf-page-header {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
  margin-bottom: var(--lf-space-8);
}

@media (min-width: 768px) {
  .lf-page-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.lf-page-header__content {
  flex: 1;
}

.lf-page-header__eyebrow {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lf-primary);
  margin-bottom: var(--lf-space-2);
}

.lf-page-header__title {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--lf-text-primary);
}

.lf-page-header__description {
  margin: var(--lf-space-2) 0 0 0;
  font-size: 1rem;
  color: var(--lf-text-secondary);
}

.lf-page-header__actions {
  display: flex;
  gap: var(--lf-space-3);
  align-items: center;
}
</style>
