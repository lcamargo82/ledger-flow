import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AsyncJob, ListAsyncJobsFilters } from '../types/platform-async-jobs.types';
import { platformAsyncJobsService } from '../services/platform-async-jobs.service';

export const usePlatformAsyncJobsStore = defineStore('platformAsyncJobs', () => {
  const jobs = ref<AsyncJob[]>([]);
  const total = ref(0);
  const loading = ref(false);

  const fetchJobs = async (filters: ListAsyncJobsFilters) => {
    loading.value = true;
    try {
      const response = await platformAsyncJobsService.list(filters);
      jobs.value = response.items;
      total.value = response.total;
    } finally {
      loading.value = false;
    }
  };

  const replayJob = async (id: string) => {
    await platformAsyncJobsService.replay(id);
  };

  return {
    jobs,
    total,
    loading,
    fetchJobs,
    replayJob
  };
});
