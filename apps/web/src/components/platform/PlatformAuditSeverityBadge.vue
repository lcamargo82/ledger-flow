<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import AppBadge from '../common/AppBadge.vue';
import type { AuditSeverity } from '../../types/platform-audit.types';

const props = defineProps<{
  severity?: AuditSeverity;
}>();

const { t } = useI18n();

const badgeVariant = computed(() => {
  switch (props.severity) {
    case 'CRITICAL':
      return 'danger';
    case 'WARNING':
      return 'warning';
    case 'INFO':
    default:
      return 'info';
  }
});

const label = computed(() => {
  if (!props.severity) return t('platform.audit.severity.INFO');
  return t(`platform.audit.severity.${props.severity}`);
});
</script>

<template>
  <AppBadge :variant="badgeVariant">
    {{ label }}
  </AppBadge>
</template>
