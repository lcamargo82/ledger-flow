<template>
  <div class="lf-empty-state">
    <div v-if="icon" class="lf-empty-state__icon">
      <!-- Optionally render an icon name if passed, or use slot -->
      <slot name="icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-large">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
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
  border: 1px dashed var(--lf-border);
  border-radius: var(--lf-radius);
}

.lf-empty-state__icon {
  color: var(--lf-text-muted);
  margin-bottom: var(--lf-space-4);
}

.icon-large {
  width: 3rem;
  height: 3rem;
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
