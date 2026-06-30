<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '../../composables/useI18n';
import AppInput from '../common/AppInput.vue';
import AppSelect from '../common/AppSelect.vue';
import AppButton from '../common/AppButton.vue';
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
  { value: 'USER', label: 'User' },
  { value: 'PLATFORM_ADMIN', label: 'Platform Admin' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'WEBHOOK', label: 'Webhook' },
  { value: 'WORKER', label: 'Worker' },
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
  <div class="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
    <AppInput
      v-model="filters.search"
      :label="t('platform.audit.filters.search')"
      :placeholder="t('platform.audit.filters.searchPlaceholder')"
      @keyup.enter="applyFilters"
      class="flex-1 min-w-[200px]"
    />
    
    <AppSelect
      v-model="filters.severity"
      :label="t('platform.audit.filters.severity')"
      :options="severityOptions"
      class="flex-1 min-w-[200px]"
    />
    
    <AppSelect
      v-model="filters.actorType"
      :label="t('platform.audit.filters.actorType')"
      :options="actorOptions"
      class="flex-1 min-w-[200px]"
    />
    
    <AppInput
      v-model="filters.source"
      :label="t('platform.audit.filters.source')"
      placeholder="e.g. ASAAS"
      @keyup.enter="applyFilters"
      class="flex-1 min-w-[200px]"
    />

    <AppInput
      v-model="filters.dateFrom"
      type="date"
      :label="t('platform.audit.filters.dateFrom')"
      class="flex-1 min-w-[150px]"
    />

    <AppInput
      v-model="filters.dateTo"
      type="date"
      :label="t('platform.audit.filters.dateTo')"
      class="flex-1 min-w-[150px]"
    />
    
    <div class="flex gap-2 ml-auto">
      <AppButton variant="secondary" @click="clearFilters">
        {{ t('platform.audit.filters.clear') }}
      </AppButton>
      <AppButton variant="primary" @click="applyFilters">
        {{ t('platform.audit.filters.apply') }}
      </AppButton>
    </div>
  </div>
</template>
