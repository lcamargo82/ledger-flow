<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useInventoryStore } from '../stores/inventory.store'
import type { InventoryTransfer, InventoryTransferStatus } from '../types/inventory.types'
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

interface TransferItemForm {
  skuId: string
  quantity: number | null
}

const { t, currentLocale } = useI18n()
const authStore = useAuthStore()
const inventoryStore = useInventoryStore()

const isCreateModalOpen = ref(false)
const submitError = ref('')
const transitionError = ref('')
const cancelTransferId = ref('')
const cancelForm = reactive({ reasonCode: 'OTHER', notes: '' })
const transferForm = reactive({
  sourceWarehouseId: '',
  destinationWarehouseId: '',
  reasonCode: 'REPLENISHMENT',
  notes: '',
  items: [{ skuId: '', quantity: null }] as TransferItemForm[],
})

const columns = computed(() => [
  { key: 'transferNumber', label: t('inventory.transfers.table.number') },
  { key: 'status', label: t('inventory.transfers.table.status') },
  { key: 'sourceWarehouse', label: t('inventory.transfers.table.source') },
  { key: 'destinationWarehouse', label: t('inventory.transfers.table.destination') },
  { key: 'items', label: t('inventory.transfers.table.items') },
  { key: 'reasonCode', label: t('inventory.transfers.table.reason') },
  { key: 'createdAt', label: t('inventory.transfers.table.createdAt') },
  { key: 'actions', label: t('inventory.transfers.table.actions'), align: 'right' as const },
])

const warehouseOptions = computed(() => [
  { value: '', label: t('inventory.form.warehousePlaceholder') },
  ...inventoryStore.activeWarehouses.map((warehouse) => ({
    value: warehouse.id,
    label: `${warehouse.code} - ${warehouse.name}`,
  })),
])

const reasonOptions = computed(() =>
  ['REPLENISHMENT', 'REBALANCING', 'RETURN_TO_STOCK', 'DAMAGED_STOCK_RELOCATION', 'OTHER'].map(
    (code) => ({
      value: code,
      label: t(`inventory.reasonCodes.transfer.${code}`),
    }),
  ),
)

onMounted(async () => {
  await Promise.all([inventoryStore.fetchWarehouses(), inventoryStore.fetchTransfers()])
})

const statusVariant = (status: InventoryTransferStatus) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_TRANSIT') return 'info'
  if (status === 'CANCELED') return 'default'
  return 'warning'
}

const openCreateModal = () => {
  submitError.value = ''
  transferForm.sourceWarehouseId = ''
  transferForm.destinationWarehouseId = ''
  transferForm.reasonCode = 'REPLENISHMENT'
  transferForm.notes = ''
  transferForm.items = [{ skuId: '', quantity: null }]
  isCreateModalOpen.value = true
}

const addItem = () => {
  transferForm.items.push({ skuId: '', quantity: null })
}

const removeItem = (index: number) => {
  transferForm.items.splice(index, 1)
  if (!transferForm.items.length) addItem()
}

const createStableOperationId = (prefix: string, id?: string) =>
  `${prefix}-${id || crypto.randomUUID()}`

const createTransfer = async () => {
  submitError.value = ''
  if (transferForm.sourceWarehouseId === transferForm.destinationWarehouseId) {
    submitError.value = 'inventory.transfers.errors.sameWarehouse'
    return
  }

  try {
    await inventoryStore.createTransfer({
      sourceWarehouseId: transferForm.sourceWarehouseId,
      destinationWarehouseId: transferForm.destinationWarehouseId,
      idempotencyKey: createStableOperationId('transfer'),
      reasonCode: transferForm.reasonCode,
      notes: transferForm.notes || undefined,
      items: transferForm.items.map((item) => ({
        skuId: item.skuId,
        quantity: Number(item.quantity),
      })),
    })
    isCreateModalOpen.value = false
  } catch (error) {
    submitError.value = errorKey(error)
  }
}

const startTransfer = async (transfer: InventoryTransfer) => {
  transitionError.value = ''
  try {
    await inventoryStore.startTransfer(transfer.id)
  } catch (error) {
    transitionError.value = errorKey(error)
  }
}

const completeTransfer = async (transfer: InventoryTransfer) => {
  transitionError.value = ''
  try {
    await inventoryStore.completeTransfer(transfer.id, {
      idempotencyKey: createStableOperationId('complete-transfer', transfer.id),
    })
  } catch (error) {
    transitionError.value = errorKey(error)
  }
}

const openCancelModal = (transfer: InventoryTransfer) => {
  transitionError.value = ''
  cancelTransferId.value = transfer.id
  cancelForm.reasonCode = 'OTHER'
  cancelForm.notes = ''
}

const cancelTransfer = async () => {
  if (!cancelTransferId.value) return

  try {
    await inventoryStore.cancelTransfer(cancelTransferId.value, {
      reasonCode: cancelForm.reasonCode,
      notes: cancelForm.notes || undefined,
    })
    cancelTransferId.value = ''
  } catch (error) {
    transitionError.value = errorKey(error)
  }
}

const errorKey = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) return 'inventory.transfers.errors.invalid'
    if (error.response?.status === 403) return 'inventory.errors.forbidden'
    if (error.response?.status === 404) return 'inventory.errors.notFound'
    if (error.response?.status === 409) return 'inventory.transfers.errors.conflict'
  }
  return 'inventory.errors.default'
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="t('inventory.transfers.title')"
      :description="t('inventory.transfers.description')"
    >
      <template #actions>
        <AppButton
          v-if="authStore.checkAllPermissions(['inventory:transfer'])"
          variant="primary"
          @click="openCreateModal"
        >
          {{ t('inventory.transfers.actions.create') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="inventoryStore.error"
      :title="t('inventory.transfers.errors.title')"
      :description="t(inventoryStore.error)"
      @retry="inventoryStore.fetchTransfers()"
    />

    <template v-else>
      <AppCard v-if="transitionError">
        <p class="lf-error-message" role="alert">{{ t(transitionError) }}</p>
      </AppCard>

      <AppTable
        :columns="columns"
        :items="inventoryStore.transfers"
        :is-loading="inventoryStore.isLoading"
        :empty-title="t('inventory.transfers.empty.title')"
        :empty-description="t('inventory.transfers.empty.description')"
      >
        <template #status="{ item }">
          <AppBadge :variant="statusVariant(item.status)">
            {{ t(`inventory.transferStatus.${item.status}`) }}
          </AppBadge>
        </template>
        <template #sourceWarehouse="{ item }">
          {{ item.sourceWarehouse.name }} · <span translate="no">{{ item.sourceWarehouse.code }}</span>
        </template>
        <template #destinationWarehouse="{ item }">
          {{ item.destinationWarehouse.name }} ·
          <span translate="no">{{ item.destinationWarehouse.code }}</span>
        </template>
        <template #items="{ item }">
          <div v-for="transferItem in item.items" :key="transferItem.id" class="space-y-0.5">
            <span>{{ transferItem.sku.product.name }}</span>
            <span class="block text-xs text-[var(--lf-text-secondary)]" translate="no">
              {{ transferItem.sku.skuDisplay }} · {{ transferItem.quantity }}
            </span>
          </div>
        </template>
        <template #reasonCode="{ item }">
          {{ t(`inventory.reasonCodes.transfer.${item.reasonCode}`) }}
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
              @click="startTransfer(item)"
            >
              {{ t('inventory.transfers.actions.start') }}
            </AppButton>
            <AppButton
              v-if="item.status === 'IN_TRANSIT'"
              size="small"
              variant="primary"
              @click="completeTransfer(item)"
            >
              {{ t('inventory.transfers.actions.complete') }}
            </AppButton>
            <AppButton
              v-if="item.status === 'DRAFT' || item.status === 'IN_TRANSIT'"
              size="small"
              variant="secondary"
              @click="openCancelModal(item)"
            >
              {{ t('inventory.transfers.actions.cancel') }}
            </AppButton>
          </div>
        </template>
      </AppTable>
    </template>

    <AppModal
      v-model="isCreateModalOpen"
      :title="t('inventory.transfers.form.createTitle')"
      size="lg"
    >
      <form class="space-y-4" @submit.prevent="createTransfer">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppSelect
            v-model="transferForm.sourceWarehouseId"
            :label="t('inventory.transfers.form.sourceWarehouse')"
            :options="warehouseOptions"
            required
          />
          <AppSelect
            v-model="transferForm.destinationWarehouseId"
            :label="t('inventory.transfers.form.destinationWarehouse')"
            :options="warehouseOptions"
            required
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppSelect
            v-model="transferForm.reasonCode"
            :label="t('inventory.form.reasonCodeLabel')"
            :options="reasonOptions"
            required
          />
          <AppInput v-model="transferForm.notes" :label="t('inventory.form.notesLabel')" />
        </div>
        <div class="space-y-3">
          <div
            v-for="(item, index) in transferForm.items"
            :key="index"
            class="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end"
          >
            <AppInput v-model="item.skuId" :label="t('inventory.form.skuIdLabel')" required />
            <AppNumberInput
              v-model="item.quantity"
              :allow-decimals="true"
              :label="t('inventory.form.quantityLabel')"
              required
            />
            <AppButton type="button" variant="secondary" @click="removeItem(index)">
              {{ t('inventory.transfers.actions.removeItem') }}
            </AppButton>
          </div>
          <AppButton type="button" variant="secondary" @click="addItem">
            {{ t('inventory.transfers.actions.addItem') }}
          </AppButton>
        </div>
        <p v-if="submitError" class="lf-error-message" role="alert">{{ t(submitError) }}</p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isCreateModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{ t('inventory.transfers.actions.create') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      :model-value="!!cancelTransferId"
      :title="t('inventory.transfers.form.cancelTitle')"
      size="md"
      @update:model-value="
        (value) => {
          if (!value) cancelTransferId = ''
        }
      "
    >
      <form class="space-y-4" @submit.prevent="cancelTransfer">
        <AppSelect
          v-model="cancelForm.reasonCode"
          :label="t('inventory.form.reasonCodeLabel')"
          :options="reasonOptions"
        />
        <AppInput v-model="cancelForm.notes" :label="t('inventory.form.notesLabel')" />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="cancelTransferId = ''">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{ t('inventory.transfers.actions.cancel') }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>
