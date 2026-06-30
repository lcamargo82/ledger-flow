import { api } from '@/services/api';
import type { AsyncJob, ListAsyncJobsFilters } from '../types/platform-async-jobs.types';

export const platformAsyncJobsService = {
  async list(filters: ListAsyncJobsFilters): Promise<{ items: AsyncJob[]; total: number }> {
    const { data } = await api.get('/platform/async-jobs', { params: filters });
    return data;
  },

  async replay(id: string): Promise<void> {
    await api.post(\`/platform/async-jobs/\${id}/replay\`);
  }
};
