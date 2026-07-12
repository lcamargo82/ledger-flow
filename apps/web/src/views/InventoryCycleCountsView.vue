<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useInventoryStore } from '../stores/inventory.store'
import type { CycleCount, CycleCountItem, CycleCountStatus } from '../types/inventory.types'
import { formatDateTime } from '../utils/date-format'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppModal from '../components/common/AppModal.vue'
import AppNumberInput from '../components/common/AppNumberInput.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'

interface CountItemForm {
  skuId: string
}

const { t, currentLocale } = useI18n()
const authStore = useAuthStore()
const inventoryStore = useInventoryStore()

const isCreateModalOpen = ref(false)
const countModal = ref<{ count: CycleCount; item: CycleCountItem } | null>(null)
const approvalCount = ref<CycleCount | null>(null)
const cancelCount = ref<CycleCount | null>(null)
const submitError = ref('')
const transitionError = ref('')
const countedQuantity = ref<number | null>(null)
const transitionForm = reactive({ reasonCode: 'DISCREPANCY_RECOUNT', notes: '' })
const countForm = reactive({
  warehouseId: '',
  reasonCode: 'SCHEDULED_COUNT',
  notes: '',
  items: [{ skuId: '' }] as CountItemForm[],
})

const columns = computed(() => [
  { key: 'countNumber', label: t('inventory.cycleCounts.table.number') },
  { key: 'status', label: t('inventory.cycleCounts.table.status') },
  { key: 'warehouseId', label: t('inventory.cycleCounts.table.warehouse') },
  { key: 'items', label: t('inventory.cycleCounts.table.items') },
  { key: 'variance', label: t('inventory.cycleCounts.table.variance') },
  { key: 'reasonCode', label: t('inventory.cycleCounts.table.reason') },
  { key: 'createdAt', label: t('inventory.cycleCounts.table.createdAt') },
  { key: 'actions', label: t('inventory.cycleCounts.table.actions'), align: 'right' as const },
])

const warehouseOptions = computed(() => [
  { value: '', label: t('inventory.form.warehousePlaceholder') },
  ...inventoryStore.activeWarehouses.map((warehouse) => ({
    value: warehouse.id,
    label: `${warehouse.code} - ${warehouse.name}`,
  })),
])

const reasonOptions = computed(() =>
  ['SCHEDULED_COUNT', 'DISCREPANCY_RECOUNT', 'AUDIT_REQUEST', 'LOSS_OR_DAMAGE', 'OTHER'].map(
    (code) => ({
      value: code,
      label: t(`inventory.reasonCodes.cycleCount.${code}`),
    }),
  ),
)

onMounted(async () => {
  await Promise.all([inventoryStore.fetchWarehouses(), inventoryStore.fetchCycleCounts()])
})

const warehouseLabel = (id: string) => {
  const warehouse = inventoryStore.warehouses.find((item) => item.id === id)
  return warehouse ? `${warehouse.code} - ${warehouse.name}` : id
}

const statusVariant = (status: CycleCountStatus) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'COUNTED') return 'info'
  if (status === 'OPEN') return 'warning'
  if (status === 'CANCELED') return 'default'
  return 'warning'
}

const totalVariance = (count: CycleCount) =>
  count.items.reduce((total, item) => total + Number(item.varianceQuantity || 0), 0)

const openCreateModal = () => {
  submitError.value = ''
  countForm.warehouseId = ''
  countForm.reasonCode = 'SCHEDULED_COUNT'
  countForm.notes = ''
  countForm.items = [{ skuId: '' }]
  isCreateModalOpen.value = true
}

const addItem = () => {
  countForm.items.push({ skuId: '' })
}

const removeItem = (index: number) => {
  countForm.items.splice(index, 1)
  if (!countForm.items.length) addItem()
}

const createStableOperationId = (prefix: string, id?: string) =>
  `${prefix}-${id || crypto.randomUUID()}`

const createCycleCount = async () => {
  submitError.value = ''
  try {
    await inventoryStore.createCycleCount({
      warehouseId: countForm.warehouseId,
      idempotencyKey: createStableOperationId('cycle-count'),
      reasonCode: countForm.reasonCode,
      notes: countForm.notes || undefined,
      items: countForm.items.map((item) => ({ skuId: item.skuId })),
    })
    isCreateModalOpen.value = false
  } catch (error) {
    submitError.value = errorKey(error)
  }
}

const openCycleCount = async (count: CycleCount) => {
  transitionError.value = ''
  try {
    await inventoryStore.openCycleCount(count.id)
  } catch (error) {
    transitionError.value = errorKey(error)
  }
}

const openCountModal = (count: CycleCount, item: CycleCountItem) => {
  countModal.value = { count, item }
  countedQuantity.value = item.countedQuantity ? Number(item.countedQuantity) : null
}

const countItem = async () => {
  if (!countModal.value || countedQuantity.value === null) return
  try {
    await inventoryStore.countCycleCountItem(countModal.value.count.id, countModal.value.item.id, {
      countedQuantity: countedQuantity.value,
    })
    countModal.value = null
    countedQuantity.value = null
  } catch (error) {
    transitionError.value = errorKey(error)
  }
}

const openApproveModal = (count: CycleCount) => {
  approvalCount.value = count
  transitionForm.reasonCode = 'DISCREPANCY_RECOUNT'
  transitionForm.notes = ''
}

const approveCycleCount = async () => {
  if (!approvalCount.value) return
  try {
    await inventoryStore.approveCycleCount(approvalCount.value.id, {
      reasonCode: transitionForm.reasonCode,
      idempotencyKey: createStableOperationId('approve-cycle-count', approvalCount.value.id),
      notes: transitionForm.notes || undefined,
    })
    approvalCount.value = null
  } catch (error) {
    transitionError.value = errorKey(error)
  }
}

const openCancelModal = (count: CycleCount) => {
  cancelCount.value = count
  transitionForm.reasonCode = 'OTHER'
  transitionForm.notes = ''
}

const cancelCycleCount = async () => {
  if (!cancelCount.value) return
  try {
    await inventoryStore.cancelCycleCount(cancelCount.value.id, {
      reasonCode: transitionForm.reasonCode,
      notes: transitionForm.notes || undefined,
    })
    cancelCount.value = null
  } catch (error) {
    transitionError.value = errorKey(error)
  }
}

const errorKey = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) return 'inventory.cycleCounts.errors.invalid'
    if (error.response?.status === 403) return 'inventory.errors.forbidden'
    if (error.response?.status === 404) return 'inventory.errors.notFound'
    if (error.response?.status === 409) return 'inventory.cycleCounts.errors.stale'
  }
  return 'inventory.errors.default'
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="t('inventory.cycleCounts.title')"
      :description="t('inventory.cycleCounts.description')"
    >
      <template #actions>
        <AppButton
          v-if="authStore.checkAllPermissions(['inventory:cycle-count'])"
          variant="primary"
          @click="openCreateModal"
        >
          {{ t('inventory.cycleCounts.actions.create') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="inventoryStore.error"
      :title="t('inventory.cycleCounts.errors.title')"
      :description="t(inventoryStore.error)"
      @retry="inventoryStore.fetchCycleCounts()"
    />

    <template v-else>
      <AppCard v-if="transitionError">
        <p class="lf-error-message" role="alert">{{ t(transitionError) }}</p>
      </AppCard>

      <AppTable
        :columns="columns"
        :items="inventoryStore.cycleCounts"
        :is-loading="inventoryStore.isLoading"
        :empty-title="t('inventory.cycleCounts.empty.title')"
        :empty-description="t('inventory.cycleCounts.empty.description')"
      >
        <template #status="{ item }">
          <AppBadge :variant="statusVariant(item.status)">
            {{ t(`inventory.cycleCountStatus.${item.status}`) }}
          </AppBadge>
        </template>
        <template #warehouseId="{ item }">
          {{ warehouseLabel(item.warehouseId) }}
        </template>
        <template #items="{ item }">
          {{ t('inventory.cycleCounts.table.itemCount', { count: item.items.length }) }}
        </template>
        <template #variance="{ item }">
          {{ totalVariance(item) }}
        </template>
        <template #reasonCode="{ item }">
          {{ item.reasonCode ? t(`inventory.reasonCodes.cycleCount.${item.reasonCode}`) : '-' }}
        </template>
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>
        <template #actions="{ item }">
          <div class="flex justify-end gap-2">
            <AppButton
              v-if="item.status === 'DRAFT'"
              size="small"
              variant="secondary"
              @click="openCycleCount(item)"
            >
              {{ t('inventory.cycleCounts.actions.open') }}
            </AppButton>
            <AppButton
              v-if="item.status === 'COUNTED'"
              size="small"
              variant="primary"
              @click="openApproveModal(item)"
            >
              {{ t('inventory.cycleCounts.actions.approve') }}
            </AppButton>
            <AppButton
              v-if="item.status !== 'APPROVED' && item.status !== 'CANCELED'"
              size="small"
              variant="secondary"
              @click="openCancelModal(item)"
            >
              {{ t('inventory.cycleCounts.actions.cancel') }}
            </AppButton>
          </div>
        </template>
      </AppTable>

      <AppCard
        v-for="count in inventoryStore.cycleCounts.filter(
          (item) => item.status === 'OPEN' || item.status === 'COUNTED',
        )"
        :key="count.id"
      >
        <div class="space-y-3">
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ count.countNumber }} · {{ warehouseLabel(count.warehouseId) }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('inventory.cycleCounts.detail.snapshotHint') }}
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="lf-table">
              <thead class="lf-table-head">
                <tr>
                  <th class="lf-table-th text-left">{{ t('inventory.table.skuId') }}</th>
                  <th class="lf-table-th text-left">
                    {{ t('inventory.cycleCounts.detail.system') }}
                  </th>
                  <th class="lf-table-th text-left">
                    {{ t('inventory.cycleCounts.detail.counted') }}
                  </th>
                  <th class="lf-table-th text-left">
                    {{ t('inventory.cycleCounts.detail.variance') }}
                  </th>
                  <th class="lf-table-th text-right">{{ t('inventory.table.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in count.items" :key="item.id" class="lf-table-row">
                  <td class="lf-table-td">{{ item.skuId }}</td>
                  <td class="lf-table-td">{{ item.systemOnHandAtOpen ?? '-' }}</td>
                  <td class="lf-table-td">{{ item.countedQuantity ?? '-' }}</td>
                  <td class="lf-table-td">{{ item.varianceQuantity ?? '-' }}</td>
                  <td class="lf-table-td text-right">
                    <AppButton
                      v-if="count.status === 'OPEN' || count.status === 'COUNTED'"
                      size="small"
                      variant="secondary"
                      @click="openCountModal(count, item)"
                    >
                      {{ t('inventory.cycleCounts.actions.countItem') }}
                    </AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </AppCard>
    </template>

    <AppModal
      v-model="isCreateModalOpen"
      :title="t('inventory.cycleCounts.form.createTitle')"
      size="lg"
    >
      <form class="space-y-4" @submit.prevent="createCycleCount">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppSelect
            v-model="countForm.warehouseId"
            :label="t('inventory.form.warehouseLabel')"
            :options="warehouseOptions"
            required
          />
          <AppSelect
            v-model="countForm.reasonCode"
            :label="t('inventory.form.reasonCodeLabel')"
            :options="reasonOptions"
            required
          />
        </div>
        <AppInput v-model="countForm.notes" :label="t('inventory.form.notesLabel')" />
        <div class="space-y-3">
          <div
            v-for="(item, index) in countForm.items"
            :key="index"
            class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end"
          >
            <AppInput v-model="item.skuId" :label="t('inventory.form.skuIdLabel')" required />
            <AppButton type="button" variant="secondary" @click="removeItem(index)">
              {{ t('inventory.cycleCounts.actions.removeItem') }}
            </AppButton>
          </div>
          <AppButton type="button" variant="secondary" @click="addItem">
            {{ t('inventory.cycleCounts.actions.addItem') }}
          </AppButton>
        </div>
        <p v-if="submitError" class="lf-error-message" role="alert">{{ t(submitError) }}</p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isCreateModalOpen = false">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{ t('inventory.cycleCounts.actions.create') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      :model-value="!!countModal"
      :title="t('inventory.cycleCounts.form.countTitle')"
      size="md"
      @update:model-value="
        (value) => {
          if (!value) countModal = null
        }
      "
    >
      <form class="space-y-4" @submit.prevent="countItem">
        <p v-if="countModal" class="text-sm text-gray-500 dark:text-gray-400">
          {{ countModal.item.skuId }}
        </p>
        <AppNumberInput
          v-model="countedQuantity"
          :allow-decimals="true"
          :label="t('inventory.cycleCounts.form.countedQuantity')"
          required
        />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="countModal = null">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{ t('inventory.cycleCounts.actions.countItem') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      :model-value="!!approvalCount"
      :title="t('inventory.cycleCounts.form.approveTitle')"
      size="md"
      @update:model-value="
        (value) => {
          if (!value) approvalCount = null
        }
      "
    >
      <form class="space-y-4" @submit.prevent="approveCycleCount">
        <AppSelect
          v-model="transitionForm.reasonCode"
          :label="t('inventory.form.reasonCodeLabel')"
          :options="reasonOptions"
        />
        <AppInput v-model="transitionForm.notes" :label="t('inventory.form.notesLabel')" />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="approvalCount = null">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{ t('inventory.cycleCounts.actions.approve') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      :model-value="!!cancelCount"
      :title="t('inventory.cycleCounts.form.cancelTitle')"
      size="md"
      @update:model-value="
        (value) => {
          if (!value) cancelCount = null
        }
      "
    >
      <form class="space-y-4" @submit.prevent="cancelCycleCount">
        <AppSelect
          v-model="transitionForm.reasonCode"
          :label="t('inventory.form.reasonCodeLabel')"
          :options="reasonOptions"
        />
        <AppInput v-model="transitionForm.notes" :label="t('inventory.form.notesLabel')" />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="cancelCount = null">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{ t('inventory.cycleCounts.actions.cancel') }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>
