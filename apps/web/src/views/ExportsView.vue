<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useExportsStore } from '../stores/exports.store'
import { formatDateTime } from '../utils/date-format'
import type { ExportJob, ExportJobStatus, ExportJobType } from '../types/exports.types'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'

const { t, currentLocale } = useI18n()
const exportsStore = useExportsStore()
const selectedType = ref<ExportJobType>('CATALOG_PRODUCTS')

const columns = computed(() => [
  { key: 'createdAt', label: t('exports.table.createdAt') },
  { key: 'type', label: t('exports.table.type') },
  { key: 'format', label: t('exports.table.format') },
  { key: 'status', label: t('exports.table.status') },
  { key: 'rowCount', label: t('exports.table.rows'), align: 'right' as const },
  { key: 'expiresAt', label: t('exports.table.expiresAt') },
  { key: 'actions', label: t('exports.table.actions'), align: 'right' as const },
])

const typeOptions = computed(() => [
  { value: 'CATALOG_PRODUCTS', label: t('exports.types.CATALOG_PRODUCTS') },
  { value: 'ORDER_FINANCIAL_FACTS', label: t('exports.types.ORDER_FINANCIAL_FACTS') },
  { value: 'RECONCILIATION_CASES', label: t('exports.types.RECONCILIATION_CASES') },
  {
    value: 'MARKETPLACE_SETTLEMENT_EVENTS',
    label: t('exports.types.MARKETPLACE_SETTLEMENT_EVENTS'),
  },
])

const statusOptions = computed(() => [
  { value: '', label: t('exports.filters.allStatuses') },
  { value: 'PENDING', label: t('exports.status.PENDING') },
  { value: 'PROCESSING', label: t('exports.status.PROCESSING') },
  { value: 'COMPLETED', label: t('exports.status.COMPLETED') },
  { value: 'FAILED', label: t('exports.status.FAILED') },
  { value: 'CANCELLED', label: t('exports.status.CANCELLED') },
  { value: 'EXPIRED', label: t('exports.status.EXPIRED') },
])

const statusVariant = (status: ExportJobStatus) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED' || status === 'EXPIRED') return 'danger'
  if (status === 'PROCESSING') return 'info'
  if (status === 'PENDING') return 'warning'
  return 'default'
}

const createJob = () => {
  exportsStore.createJob({ type: selectedType.value, format: 'CSV' })
}

const canCancel = (job: ExportJob) => job.status === 'PENDING'
const canDownload = (job: ExportJob) => job.status === 'COMPLETED'

onMounted(() => {
  exportsStore.fetchJobs()
})
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader :title="t('exports.title')" :description="t('exports.description')">
      <template #actions>
        <AppButton
          variant="secondary"
          :loading="exportsStore.isMutating"
          @click="exportsStore.processPending()"
        >
          <template #icon>
            <span class="material-symbols-outlined text-base">sync</span>
          </template>
          {{ t('exports.actions.process') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="exportsStore.error"
      :title="t('exports.errors.title')"
      :description="t(exportsStore.error)"
      @retry="exportsStore.fetchJobs()"
    />

    <template v-else>
      <AppCard>
        <div class="lf-filter-container">
          <div class="lf-filter-item">
            <AppSelect
              :model-value="selectedType"
              :label="t('exports.form.type')"
              :options="typeOptions"
              @update:model-value="selectedType = $event as ExportJobType"
            />
          </div>
          <div class="lf-filter-item">
            <AppSelect
              :model-value="exportsStore.filters.status || ''"
              :label="t('exports.filters.status')"
              :options="statusOptions"
              @update:model-value="
                exportsStore.setFilters({ status: ($event || undefined) as ExportJobStatus | undefined })
              "
            />
          </div>
          <div class="lf-filter-actions">
            <AppButton :loading="exportsStore.isMutating" @click="createJob">
              <template #icon>
                <span class="material-symbols-outlined text-base">download</span>
              </template>
              {{ t('exports.actions.create') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <AppTable
        :columns="columns"
        :items="exportsStore.jobs"
        :is-loading="exportsStore.isLoading"
        :empty-title="t('exports.empty.title')"
        :empty-description="t('exports.empty.description')"
        :pagination="exportsStore.meta"
        @update:page="exportsStore.setPage"
      >
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>
        <template #type="{ item }">
          {{ t(`exports.types.${item.type}`) }}
        </template>
        <template #status="{ item }">
          <AppBadge :variant="statusVariant(item.status)">
            {{ t(`exports.status.${item.status}`) }}
          </AppBadge>
        </template>
        <template #expiresAt="{ item }">
          {{ item.expiresAt ? formatDateTime(item.expiresAt, currentLocale) : '-' }}
        </template>
        <template #actions="{ item }">
          <div class="flex justify-end gap-2">
            <AppButton
              v-if="canCancel(item)"
              variant="secondary"
              size="small"
              icon-only
              :title="t('exports.actions.cancel')"
              :disabled="exportsStore.isMutating"
              @click="exportsStore.cancelJob(item.id)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">cancel</span>
              </template>
            </AppButton>
            <AppButton
              v-if="canDownload(item)"
              size="small"
              icon-only
              :title="t('exports.actions.download')"
              :disabled="exportsStore.isMutating"
              @click="exportsStore.downloadJob(item)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">download</span>
              </template>
            </AppButton>
          </div>
        </template>
      </AppTable>
    </template>
  </div>
</template>
