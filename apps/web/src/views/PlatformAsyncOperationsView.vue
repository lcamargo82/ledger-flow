<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPageHeader from '@/components/layout/AppPageHeader.vue';
import AsyncJobFilters from '@/components/platform/AsyncJobFilters.vue';
import AsyncJobTable from '@/components/platform/AsyncJobTable.vue';
import { usePlatformAsyncJobsStore } from '@/stores/platform-async-jobs.store';

const { t } = useI18n();
const store = usePlatformAsyncJobsStore();
const filters = ref({ tenantId: '', status: '', eventType: '' });

const fetch = () => {
  store.fetchJobs(filters.value);
};

onMounted(() => {
  fetch();
});
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader 
      :title="t('nav.platformAsyncOperations')"
      :description="t('platform.async.description')"
    />
    
    <div class="flex flex-col gap-4">
      <AsyncJobFilters v-model="filters" @filter="fetch" />
      <AsyncJobTable :jobs="store.jobs" :loading="store.loading" @refresh="fetch" />
    </div>
  </div>
</template>
