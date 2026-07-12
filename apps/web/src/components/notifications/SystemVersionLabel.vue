<template>
  <span class="system-version" :title="t('notifications.version.label', { version })">
    {{ t('notifications.version.short', { version }) }}
  </span>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()
const version = import.meta.env.VITE_APP_VERSION || '10.2.0A'
</script>

<style scoped>
.system-version {
  color: var(--lf-text-muted);
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
}
</style>
