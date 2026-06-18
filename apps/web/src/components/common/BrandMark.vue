<template>
  <div class="lf-brand-mark" :class="[themeClass, variantClass]">
    <div class="lf-brand-header">
      <img :src="brandAssets.appIcon" alt="LedgerFlow Icon" class="lf-brand-icon" />
      <span class="lf-brand-name">{{ brand.name }}</span>
    </div>
    <div v-if="showTagline" class="lf-brand-tagline">
      {{ t('brand.tagline') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { brandAssets, brand } from '../../config/brand';
import { useI18n } from '../../composables/useI18n';

const props = withDefaults(defineProps<{
  variant?: 'compact' | 'full';
  theme?: 'light' | 'dark';
  showTagline?: boolean;
}>(), {
  variant: 'full',
  theme: 'dark',
  showTagline: false,
});

const { t } = useI18n();

const themeClass = computed(() => `lf-brand-mark--${props.theme}`);
const variantClass = computed(() => `lf-brand-mark--${props.variant}`);
</script>

<style scoped>
.lf-brand-mark {
  display: flex;
  flex-direction: column;
}

.lf-brand-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lf-brand-icon {
  height: 36px;
  width: auto;
  object-fit: contain;
}

.lf-brand-name {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.lf-brand-tagline {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Theme Variations */
.lf-brand-mark--dark .lf-brand-name {
  color: var(--lf-text-primary);
}

.lf-brand-mark--dark .lf-brand-tagline {
  color: var(--lf-text-secondary);
}

.lf-brand-mark--light .lf-brand-name {
  color: var(--lf-bg-primary);
}

.lf-brand-mark--light .lf-brand-tagline {
  color: var(--lf-bg-secondary);
}

/* Variant Variations */
.lf-brand-mark--compact .lf-brand-icon {
  height: 24px;
}

.lf-brand-mark--compact .lf-brand-name {
  font-size: 1.25rem;
}
</style>
