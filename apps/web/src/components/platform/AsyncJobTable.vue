<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppBadge from '@/components/ui/AppBadge.vue';
import AppButton from '@/components/ui/AppButton.vue';
import type { AsyncJob } from '@/types/platform-async-jobs.types';
import { usePlatformAsyncJobsStore } from '@/stores/platform-async-jobs.store';
import { useConfirmDialogStore } from '@/stores/confirm-dialog.store';
import { useToastStore } from '@/stores/toast.store';

const props = defineProps<{
  jobs: AsyncJob[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
}>();

const { t } = useI18n();
const store = usePlatformAsyncJobsStore();
const confirm = useConfirmDialogStore();
const toast = useToastStore();

const onReplay = (job: AsyncJob) => {
  confirm.show({
    title: t('platform.async.replay.title'),
    message: t('platform.async.replay.message', { id: job.id }),
    confirmText: t('platform.async.replay.confirm'),
    type: 'warning',
    onConfirm: async () => {
      try {
        await store.replayJob(job.id);
        toast.show({ title: 'Sucesso', message: t('platform.async.replay.success'), type: 'success' });
        emit('refresh');
      } catch (err: any) {
        toast.show({ title: 'Erro', message: t('platform.async.replay.failed'), type: 'error' });
      }
    }
  });
};
</script>

<template>
  <div class="bg-surface border border-divider rounded-lg overflow-x-auto">
    <table class="w-full text-left">
      <thead class="bg-surface-hover text-text-secondary border-b border-divider">
        <tr>
          <th class="p-4">{{ t('platform.async.table.occurredAt') }}</th>
          <th class="p-4">{{ t('platform.async.table.tenant') }}</th>
          <th class="p-4">{{ t('platform.async.table.eventType') }}</th>
          <th class="p-4">{{ t('platform.async.table.status') }}</th>
          <th class="p-4">{{ t('platform.async.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading"><td colspan="5" class="p-4 text-center">Loading...</td></tr>
        <tr v-else-if="!jobs.length"><td colspan="5" class="p-4 text-center">{{ t('platform.async.empty.title') }}</td></tr>
        <tr v-for="job in jobs" :key="job.id" class="border-b border-divider hover:bg-surface-hover">
          <td class="p-4 text-sm">{{ new Date(job.createdAt).toLocaleString() }}</td>
          <td class="p-4 text-sm">{{ job.tenantId || '-' }}</td>
          <td class="p-4 text-sm">{{ job.eventType }}</td>
          <td class="p-4"><AppBadge :type="job.status === 'FAILED' ? 'error' : 'info'">{{ job.status }}</AppBadge></td>
          <td class="p-4">
            <AppButton v-if="job.status === 'FAILED' || job.status === 'DEAD_LETTERED'" @click="onReplay(job)" variant="outline" size="sm">
              {{ t('platform.async.actions.replay') }}
            </AppButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
