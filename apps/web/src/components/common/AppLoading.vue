<template>
  <div class="lf-loading-container" role="status" aria-live="polite">
    <div class="lf-spinner"></div>
    <p v-if="text">{{ text }}</p>
    <p v-else>{{ t('common.loading') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';

interface Props {
  text?: string;
}

defineProps<Props>();

const { t } = useI18n();
</script>
