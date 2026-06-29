<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '../../composables/useI18n';
import AppButton from '../common/AppButton.vue';
import AppModal from '../common/AppModal.vue';
import PlatformAuditSeverityBadge from './PlatformAuditSeverityBadge.vue';
import type { PlatformAuditLogResponse } from '../../types/platform-audit.types';

const props = defineProps<{
  log: PlatformAuditLogResponse;
}>();

const { t } = useI18n();
const isOpen = ref(false);

const open = () => {
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

defineExpose({ open, close });
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="t('platform.audit.details.title')"
    @close="close"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ t('platform.audit.table.occurredAt') }}</span>
        <span class="text-sm text-slate-900">{{ new Date(log.occurredAt).toLocaleString() }}</span>
      </div>

      <div v-if="log.tenant" class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ t('platform.audit.table.organization') }}</span>
        <span class="text-sm text-slate-900">{{ log.tenant.name }} ({{ log.tenant.slug }})</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ t('platform.audit.table.action') }}</span>
        <span class="text-sm font-medium text-indigo-600">{{ log.action }}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ t('platform.audit.table.severity') }}</span>
        <PlatformAuditSeverityBadge :severity="log.severity" />
      </div>

      <div v-if="log.source" class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ t('platform.audit.table.source') }}</span>
        <span class="text-sm text-slate-900">{{ log.source }}</span>
      </div>

      <div v-if="log.actorType" class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ t('platform.audit.table.actorType') }}</span>
        <span class="text-sm text-slate-900">{{ log.actorType }}</span>
      </div>

      <div v-if="log.entityType" class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-500">{{ t('platform.audit.table.entityType') }}</span>
        <span class="text-sm text-slate-900">{{ log.entityType }}</span>
      </div>

      <div v-if="log.summary" class="mt-4 border-t border-slate-200 pt-4">
        <span class="block text-sm font-medium text-slate-500 mb-2">{{ t('platform.audit.table.summary') }}</span>
        <p class="text-sm text-slate-900 bg-slate-50 p-3 rounded-md">{{ log.summary }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <AppButton variant="secondary" @click="close">
          {{ t('common.close') }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
