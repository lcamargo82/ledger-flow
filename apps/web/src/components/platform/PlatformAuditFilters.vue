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
  <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <AppInput
        v-model="filters.search"
        :label="t('platform.audit.filters.search')"
        :placeholder="t('platform.audit.filters.searchPlaceholder')"
        @keyup.enter="applyFilters"
      />
      
      <AppSelect
        v-model="filters.severity"
        :label="t('platform.audit.filters.severity')"
        :options="severityOptions"
      />
      
      <AppSelect
        v-model="filters.actorType"
        :label="t('platform.audit.filters.actorType')"
        :options="actorOptions"
      />
      
      <AppInput
        v-model="filters.source"
        :label="t('platform.audit.filters.source')"
        placeholder="e.g. ASAAS"
        @keyup.enter="applyFilters"
      />

      <AppInput
        v-model="filters.dateFrom"
        type="date"
        :label="t('platform.audit.filters.dateFrom')"
      />

      <AppInput
        v-model="filters.dateTo"
        type="date"
        :label="t('platform.audit.filters.dateTo')"
      />
    </div>
    
    <div class="flex justify-end space-x-2">
      <AppButton variant="secondary" @click="clearFilters">
        {{ t('platform.audit.filters.clear') }}
      </AppButton>
      <AppButton variant="primary" @click="applyFilters">
        {{ t('platform.audit.filters.apply') }}
      </AppButton>
    </div>
  </div>
</template>
