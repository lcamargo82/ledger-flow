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
        <span class="lf-cell-date">{{ formatDate(item.occurredAt) }}</span>
      </template>

      <template #cell-tenant="{ item }">
        <span v-if="item.tenant" class="lf-cell-tenant">
          {{ item.tenant.name }}
        </span>
        <span v-else class="lf-cell-empty">-</span>
      </template>

      <template #cell-action="{ item }">
        <span class="lf-cell-action">{{ item.action }}</span>
      </template>

      <template #cell-severity="{ item }">
        <PlatformAuditSeverityBadge :severity="item.severity" />
      </template>

      <template #cell-actorType="{ item }">
        <span class="lf-cell-actor">{{ item.actorType || '-' }}</span>
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

<style scoped>
.lf-cell-date {
  font-size: 0.875rem;
  color: var(--lf-text-secondary);
}

.lf-cell-tenant {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-cell-empty {
  font-size: 0.875rem;
  color: var(--lf-text-muted);
}

.lf-cell-action {
  font-size: 0.875rem;
  color: var(--lf-primary);
  font-family: monospace;
}

.lf-cell-actor {
  font-size: 0.75rem;
  color: var(--lf-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
