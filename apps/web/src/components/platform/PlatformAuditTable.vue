<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '../../composables/useI18n';
import AppTable from '../common/AppTable.vue';
import AppButton from '../common/AppButton.vue';
import AppEmptyState from '../common/AppEmptyState.vue';
import PlatformAuditSeverityBadge from './PlatformAuditSeverityBadge.vue';
import PlatformAuditDetails from './PlatformAuditDetails.vue';
import type { PlatformAuditLogResponse } from '../../types/platform-audit.types';

const props = defineProps<{
  logs: PlatformAuditLogResponse[];
  isLoading: boolean;
}>();

const { t } = useI18n();

const detailsModal = ref<InstanceType<typeof PlatformAuditDetails> | null>(null);
const selectedLog = ref<PlatformAuditLogResponse | null>(null);

const columns = [
  { key: 'occurredAt', label: t('platform.audit.table.occurredAt') },
  { key: 'tenant', label: t('platform.audit.table.organization') },
  { key: 'action', label: t('platform.audit.table.action') },
  { key: 'severity', label: t('platform.audit.table.severity') },
  { key: 'actorType', label: t('platform.audit.table.actorType') },
  { key: 'actions', label: t('platform.audit.table.actions'), align: 'right' as const },
];

const viewDetails = (log: PlatformAuditLogResponse) => {
  selectedLog.value = log;
  setTimeout(() => detailsModal.value?.open(), 0);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};
</script>

<template>
  <div>
    <AppTable
      :columns="columns"
      :items="logs"
      :is-loading="isLoading"
      key-field="id"
    >
      <template #empty>
        <AppEmptyState
          :title="t('platform.audit.empty.title')"
          :description="t('platform.audit.empty.description')"
        />
      </template>

      <template #cell-occurredAt="{ item }">
        <span class="text-sm text-slate-600">{{ formatDate(item.occurredAt) }}</span>
      </template>

      <template #cell-tenant="{ item }">
        <span v-if="item.tenant" class="text-sm font-medium text-slate-900">
          {{ item.tenant.name }}
        </span>
        <span v-else class="text-sm text-slate-400">-</span>
      </template>

      <template #cell-action="{ item }">
        <span class="text-sm text-indigo-600 font-mono">{{ item.action }}</span>
      </template>

      <template #cell-severity="{ item }">
        <PlatformAuditSeverityBadge :severity="item.severity" />
      </template>

      <template #cell-actorType="{ item }">
        <span class="text-xs text-slate-500 uppercase tracking-wider">{{ item.actorType || '-' }}</span>
      </template>

      <template #cell-actions="{ item }">
        <AppButton
          variant="secondary"
          size="small"
          @click="viewDetails(item as any)"
        >
          {{ t('platform.audit.actions.viewDetails') }}
        </AppButton>
      </template>
    </AppTable>

    <PlatformAuditDetails
      v-if="selectedLog"
      ref="detailsModal"
      :log="selectedLog"
    />
  </div>
</template>
