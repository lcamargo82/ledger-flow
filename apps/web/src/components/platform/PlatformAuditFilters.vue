<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '../../composables/useI18n';
import AppInput from '../common/AppInput.vue';
import AppSelect from '../common/AppSelect.vue';
import AppButton from '../common/AppButton.vue';
import AppCard from '../common/AppCard.vue';
import type { AuditSeverity, AuditActorType, ListPlatformAuditLogsQuery } from '../../types/platform-audit.types';

const props = defineProps<{
  initialFilters: ListPlatformAuditLogsQuery;
}>();

const emit = defineEmits<{
  (e: 'filter', filters: ListPlatformAuditLogsQuery): void;
}>();

const { t } = useI18n();

const filters = ref<ListPlatformAuditLogsQuery>({
  ...props.initialFilters,
});

const severityOptions = [
  { value: '', label: t('common.all') },
  { value: 'INFO', label: t('platform.audit.severity.INFO') },
  { value: 'WARNING', label: t('platform.audit.severity.WARNING') },
  { value: 'CRITICAL', label: t('platform.audit.severity.CRITICAL') },
];

const actorOptions = [
  { value: '', label: t('common.all') },
  { value: 'USER', label: t('platform.audit.actorType.USER') },
  { value: 'PLATFORM_ADMIN', label: t('platform.audit.actorType.PLATFORM_ADMIN') },
  { value: 'SYSTEM', label: t('platform.audit.actorType.SYSTEM') },
  { value: 'WEBHOOK', label: t('platform.audit.actorType.WEBHOOK') },
  { value: 'WORKER', label: t('platform.audit.actorType.WORKER') },
];

const applyFilters = () => {
  emit('filter', { ...filters.value, page: 1 });
};

const clearFilters = () => {
  filters.value = {
    search: '',
    severity: '',
    actorType: '',
    source: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
  };
  applyFilters();
};
</script>

<template>
  <AppCard class="mb-6">
    <div class="filters-row">
      <div class="filter-item filter-item--large">
        <AppInput
          v-model="filters.search"
          :label="t('platform.audit.filters.search')"
          :placeholder="t('platform.audit.filters.searchPlaceholder')"
          @keyup.enter="applyFilters"
        />
      </div>
      
      <div class="filter-item">
        <AppSelect
          v-model="filters.severity"
          :label="t('platform.audit.filters.severity')"
          :options="severityOptions"
        />
      </div>
      
      <div class="filter-item">
        <AppSelect
          v-model="filters.actorType"
          :label="t('platform.audit.filters.actorType')"
          :options="actorOptions"
        />
      </div>
      
      <div class="filter-item">
        <AppInput
          v-model="filters.source"
          :label="t('platform.audit.filters.source')"
          placeholder="e.g. ASAAS"
          @keyup.enter="applyFilters"
        />
      </div>

      <div class="filter-item">
        <AppInput
          v-model="filters.dateFrom"
          type="date"
          :label="t('platform.audit.filters.dateFrom')"
        />
      </div>

      <div class="filter-item">
        <AppInput
          v-model="filters.dateTo"
          type="date"
          :label="t('platform.audit.filters.dateTo')"
        />
      </div>
      
      <div class="filter-actions">
        <AppButton variant="secondary" @click="clearFilters">
          {{ t('platform.audit.filters.clear') }}
        </AppButton>
        <AppButton variant="primary" @click="applyFilters">
          {{ t('platform.audit.filters.apply') }}
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.mb-6 {
  margin-bottom: var(--lf-space-6);
}

.filters-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--lf-space-4);
  align-items: flex-end;
}

.filter-item {
  flex: 1;
  min-width: 150px;
}

.filter-item--large {
  min-width: 200px;
}

.filter-actions {
  display: flex;
  gap: var(--lf-space-2);
  margin-left: auto;
}
</style>
