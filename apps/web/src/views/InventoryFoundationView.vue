<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useInventoryStore } from '../stores/inventory.store'
import type { InventoryReservation, Warehouse } from '../types/inventory.types'
import { formatDateTime } from '../utils/date-format'
import {
  validateWarehouseForm,
  type WarehouseFormErrors,
} from '../utils/inventory-validation'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppNumberInput from '../components/common/AppNumberInput.vue'
import AppModal from '../components/common/AppModal.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'

const { t, currentLocale } = useI18n()
const authStore = useAuthStore()
const inventoryStore = useInventoryStore()
const route = useRoute()
const router = useRouter()

type InventoryTab = 'warehouses' | 'balances' | 'movements' | 'reservations'

const getTabFromRoute = (): InventoryTab => {
  if (route.name === 'inventory-warehouses') return 'warehouses'
  if (route.name === 'inventory-movements') return 'movements'
  if (route.name === 'inventory-reservations') return 'reservations'
  return 'balances'
}

const activeTab = ref<InventoryTab>(getTabFromRoute())
const isWarehouseModalOpen = ref(false)
const isAdjustmentModalOpen = ref(false)
const isReserveModalOpen = ref(false)
const isTransitionModalOpen = ref(false)
const transitionMode = ref<'release' | 'consume'>('consume')
const selectedReservation = ref<InventoryReservation | null>(null)

const warehouseForm = reactive({ id: '', code: '', name: '' })
const warehouseFormErrors = ref<WarehouseFormErrors>({})
const warehouseSubmitError = ref('')
const adjustmentSubmitError = ref('')
const adjustmentForm = reactive({
  skuId: '',
  warehouseId: '',
  type: 'ADJUSTMENT_IN' as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT',
  quantity: null as number | null,
  reasonCode: '',
  notes: '',
})
const reserveForm = reactive({
  skuId: '',
  warehouseId: '',
  quantity: null as number | null,
  sourceType: 'ADMIN_RESERVATION',
  sourceId: '',
  reasonCode: '',
  notes: '',
})
const transitionForm = reactive({
  reasonCode: '',
  notes: '',
})

const warehouseColumns = computed(() => [
  { key: 'code', label: t('inventory.table.code') },
  { key: 'name', label: t('inventory.table.name') },
  { key: 'status', label: t('inventory.table.status') },
  { key: 'createdAt', label: t('inventory.table.createdAt') },
  { key: 'actions', label: t('inventory.table.actions'), align: 'right' as const },
])

const balanceColumns = computed(() => [
  { key: 'product', label: t('inventory.table.product') },
  { key: 'sku', label: t('inventory.table.sku') },
  { key: 'warehouse', label: t('inventory.table.warehouse') },
  { key: 'onHandQuantity', label: t('inventory.table.onHand') },
  { key: 'reservedQuantity', label: t('inventory.table.reserved') },
  { key: 'availableQuantity', label: t('inventory.table.available') },
  { key: 'updatedAt', label: t('inventory.table.updatedAt') },
])

const movementColumns = computed(() => [
  { key: 'occurredAt', label: t('inventory.table.occurredAt') },
  { key: 'type', label: t('inventory.table.type') },
  { key: 'product', label: t('inventory.table.product') },
  { key: 'sku', label: t('inventory.table.sku') },
  { key: 'warehouse', label: t('inventory.table.warehouse') },
  { key: 'quantityDelta', label: t('inventory.table.quantity') },
  { key: 'reasonCode', label: t('inventory.table.reason') },
])

const reservationColumns = computed(() => [
  { key: 'createdAt', label: t('inventory.table.createdAt') },
  { key: 'status', label: t('inventory.table.status') },
  { key: 'product', label: t('inventory.table.product') },
  { key: 'sku', label: t('inventory.table.sku') },
  { key: 'warehouse', label: t('inventory.table.warehouse') },
  { key: 'quantity', label: t('inventory.table.quantity') },
  { key: 'source', label: t('inventory.table.source') },
  { key: 'reasonCode', label: t('inventory.table.reason') },
  { key: 'actions', label: t('inventory.table.actions'), align: 'right' as const },
])

const warehouseOptions = computed(() => [
  { value: '', label: t('inventory.form.warehousePlaceholder') },
  ...inventoryStore.activeWarehouses.map((warehouse) => ({
    value: warehouse.id,
    label: `${warehouse.code} - ${warehouse.name}`,
  })),
])

const movementTypeOptions = computed(() => [
  { value: 'ADJUSTMENT_IN', label: t('inventory.movementType.ADJUSTMENT_IN') },
  { value: 'ADJUSTMENT_OUT', label: t('inventory.movementType.ADJUSTMENT_OUT') },
])

onMounted(() => {
  inventoryStore.fetchInventory()
})

watch(
  () => route.name,
  () => {
    activeTab.value = getTabFromRoute()
  },
)

const navigateTab = (tab: InventoryTab) => {
  const routeNameByTab: Record<InventoryTab, string> = {
    balances: 'inventory',
    warehouses: 'inventory-warehouses',
    movements: 'inventory-movements',
    reservations: 'inventory-reservations',
  }

  activeTab.value = tab
  router.push({ name: routeNameByTab[tab] })
}

const openWarehouseModal = () => {
  warehouseForm.id = ''
  warehouseForm.code = ''
  warehouseForm.name = ''
  warehouseFormErrors.value = {}
  warehouseSubmitError.value = ''
  isWarehouseModalOpen.value = true
}

const openEditWarehouseModal = (warehouse: Warehouse) => {
  warehouseForm.id = warehouse.id
  warehouseForm.code = warehouse.code
  warehouseForm.name = warehouse.name
  warehouseFormErrors.value = {}
  warehouseSubmitError.value = ''
  isWarehouseModalOpen.value = true
}

const saveWarehouse = async () => {
  warehouseFormErrors.value = validateWarehouseForm(warehouseForm)
  warehouseSubmitError.value = ''

  if (Object.keys(warehouseFormErrors.value).length) return

  try {
    if (warehouseForm.id) {
      await inventoryStore.updateWarehouse(warehouseForm.id, {
        name: warehouseForm.name.trim(),
      })
    } else {
      await inventoryStore.createWarehouse({
        code: warehouseForm.code.trim(),
        name: warehouseForm.name.trim(),
      })
    }
    warehouseForm.id = ''
    warehouseForm.code = ''
    warehouseForm.name = ''
    isWarehouseModalOpen.value = false
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    const errorKeyByStatus: Record<number, string> = {
      400: 'inventory.errors.invalid',
      403: 'inventory.errors.forbidden',
      409: 'inventory.errors.warehouseCodeExists',
    }
    warehouseSubmitError.value =
      (status && errorKeyByStatus[status]) || 'inventory.errors.default'
  }
}

const clearWarehouseFieldError = (field: keyof WarehouseFormErrors) => {
  delete warehouseFormErrors.value[field]
  warehouseSubmitError.value = ''
}

const toggleWarehouse = async (id: string, isActive: boolean) => {
  await inventoryStore.updateWarehouse(id, { isActive: !isActive })
}

const recordAdjustment = async () => {
  adjustmentSubmitError.value = ''

  try {
    await inventoryStore.recordAdjustment({
      skuId: adjustmentForm.skuId.trim(),
      warehouseId: adjustmentForm.warehouseId,
      type: adjustmentForm.type,
      quantity: Number(adjustmentForm.quantity),
      reasonCode: adjustmentForm.reasonCode,
      notes: adjustmentForm.notes || undefined,
    })
    adjustmentForm.skuId = ''
    adjustmentForm.warehouseId = ''
    adjustmentForm.quantity = null
    adjustmentForm.reasonCode = ''
    adjustmentForm.notes = ''
    isAdjustmentModalOpen.value = false
  } catch {
    adjustmentSubmitError.value = inventoryStore.error || 'inventory.errors.default'
    inventoryStore.clearError()
  }
}

const createStableOperationId = (prefix: string, id?: string) =>
  `${prefix}-${id || crypto.randomUUID()}`

const reserveStock = async () => {
  const sourceId = reserveForm.sourceId || crypto.randomUUID()
  await inventoryStore.reserveStock({
    skuId: reserveForm.skuId,
    warehouseId: reserveForm.warehouseId,
    quantity: Number(reserveForm.quantity),
    sourceType: reserveForm.sourceType,
    sourceId,
    idempotencyKey: createStableOperationId('reserve', sourceId),
    reasonCode: reserveForm.reasonCode,
    notes: reserveForm.notes || undefined,
  })
  reserveForm.skuId = ''
  reserveForm.warehouseId = ''
  reserveForm.quantity = null
  reserveForm.sourceType = 'ADMIN_RESERVATION'
  reserveForm.sourceId = ''
  reserveForm.reasonCode = ''
  reserveForm.notes = ''
  isReserveModalOpen.value = false
}

const openReservationTransition = (
  reservation: InventoryReservation,
  mode: 'release' | 'consume',
) => {
  selectedReservation.value = reservation
  transitionMode.value = mode
  transitionForm.reasonCode = ''
  transitionForm.notes = ''
  isTransitionModalOpen.value = true
}

const transitionReservation = async () => {
  if (!selectedReservation.value) return

  const payload = {
    reasonCode: transitionForm.reasonCode,
    notes: transitionForm.notes || undefined,
    idempotencyKey: createStableOperationId(transitionMode.value, selectedReservation.value.id),
  }

  if (transitionMode.value === 'consume') {
    await inventoryStore.consumeReservation(selectedReservation.value.id, payload)
  } else {
    await inventoryStore.releaseReservation(selectedReservation.value.id, payload)
  }

  selectedReservation.value = null
  transitionForm.reasonCode = ''
  transitionForm.notes = ''
  isTransitionModalOpen.value = false
}

const reservationStatusVariant = (status: InventoryReservation['status']) => {
  if (status === 'ACTIVE') return 'warning'
  if (status === 'CONSUMED') return 'success'
  return 'default'
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader :title="t('inventory.title')" :description="t('inventory.description')">
      <template #actions>
        <div class="flex gap-2">
          <AppButton
            v-if="authStore.checkAllPermissions(['inventory:manage'])"
            variant="secondary"
            @click="openWarehouseModal"
          >
            {{ t('inventory.actions.createWarehouse') }}
          </AppButton>
          <AppButton
            v-if="authStore.checkAllPermissions(['inventory:adjust'])"
            variant="primary"
            @click="isAdjustmentModalOpen = true"
          >
            {{ t('inventory.actions.adjust') }}
          </AppButton>
          <AppButton
            v-if="authStore.checkAllPermissions(['inventory:manage'])"
            variant="primary"
            @click="isReserveModalOpen = true"
          >
            {{ t('inventory.actions.reserve') }}
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="inventoryStore.error"
      :title="t('inventory.errors.title')"
      :description="t(inventoryStore.error)"
      @retry="inventoryStore.fetchInventory()"
    />

    <template v-else>
      <AppCard>
        <div class="flex gap-2">
          <AppButton
            :variant="activeTab === 'warehouses' ? 'primary' : 'secondary'"
            @click="navigateTab('warehouses')"
          >
            {{ t('inventory.tabs.warehouses') }}
          </AppButton>
          <AppButton
            :variant="activeTab === 'balances' ? 'primary' : 'secondary'"
            @click="navigateTab('balances')"
          >
            {{ t('inventory.tabs.balances') }}
          </AppButton>
          <AppButton
            :variant="activeTab === 'movements' ? 'primary' : 'secondary'"
            @click="navigateTab('movements')"
          >
            {{ t('inventory.tabs.movements') }}
          </AppButton>
          <AppButton
            :variant="activeTab === 'reservations' ? 'primary' : 'secondary'"
            @click="navigateTab('reservations')"
          >
            {{ t('inventory.tabs.reservations') }}
          </AppButton>
        </div>
      </AppCard>

      <AppTable
        v-if="activeTab === 'warehouses'"
        :columns="warehouseColumns"
        :items="inventoryStore.warehouses"
        :is-loading="inventoryStore.isLoading"
        :empty-title="t('inventory.empty.warehousesTitle')"
        :empty-description="t('inventory.empty.warehousesDescription')"
      >
        <template #status="{ item }">
          <AppBadge :variant="item.isActive ? 'success' : 'default'">
            {{ item.isActive ? t('common.enabled') : t('common.disabled') }}
          </AppBadge>
        </template>
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>
        <template #actions="{ item }">
          <div class="flex justify-end gap-2">
            <AppButton
              v-if="authStore.checkAllPermissions(['inventory:manage'])"
              size="small"
              variant="secondary"
              icon-only
              :title="t('inventory.actions.editWarehouse')"
              @click="openEditWarehouseModal(item)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </template>
            </AppButton>
            <AppButton
              v-if="authStore.checkAllPermissions(['inventory:manage'])"
              size="small"
              variant="secondary"
              icon-only
              :title="item.isActive ? t('inventory.actions.disable') : t('inventory.actions.enable')"
              @click="toggleWarehouse(item.id, item.isActive)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">{{ item.isActive ? 'block' : 'check_circle' }}</span>
              </template>
            </AppButton>
          </div>
        </template>
      </AppTable>

      <AppTable
        v-if="activeTab === 'balances'"
        :columns="balanceColumns"
        :items="inventoryStore.balances"
        :is-loading="inventoryStore.isLoading"
        :empty-title="t('inventory.empty.balancesTitle')"
        :empty-description="t('inventory.empty.balancesDescription')"
      >
        <template #product="{ item }">{{ item.sku.product.name }}</template>
        <template #sku="{ item }"><span translate="no">{{ item.sku.skuDisplay }}</span></template>
        <template #warehouse="{ item }">
          {{ item.warehouse.name }} · <span translate="no">{{ item.warehouse.code }}</span>
        </template>
        <template #updatedAt="{ item }">
          {{ formatDateTime(item.updatedAt, currentLocale) }}
        </template>
      </AppTable>

      <AppTable
        v-if="activeTab === 'movements'"
        :columns="movementColumns"
        :items="inventoryStore.movements"
        :is-loading="inventoryStore.isLoading"
        :empty-title="t('inventory.empty.movementsTitle')"
        :empty-description="t('inventory.empty.movementsDescription')"
      >
        <template #product="{ item }">{{ item.sku.product.name }}</template>
        <template #sku="{ item }"><span translate="no">{{ item.sku.skuDisplay }}</span></template>
        <template #warehouse="{ item }">
          {{ item.warehouse.name }} · <span translate="no">{{ item.warehouse.code }}</span>
        </template>
        <template #occurredAt="{ item }">
          {{ formatDateTime(item.occurredAt, currentLocale) }}
        </template>
        <template #type="{ item }">
          <AppBadge variant="info">{{ t(`inventory.movementType.${item.type}`) }}</AppBadge>
        </template>
      </AppTable>

      <AppTable
        v-if="activeTab === 'reservations'"
        :columns="reservationColumns"
        :items="inventoryStore.reservations"
        :is-loading="inventoryStore.isLoading"
        :empty-title="t('inventory.empty.reservationsTitle')"
        :empty-description="t('inventory.empty.reservationsDescription')"
      >
        <template #product="{ item }">{{ item.sku.product.name }}</template>
        <template #sku="{ item }"><span translate="no">{{ item.sku.skuDisplay }}</span></template>
        <template #warehouse="{ item }">
          {{ item.warehouse.name }} · <span translate="no">{{ item.warehouse.code }}</span>
        </template>
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>
        <template #status="{ item }">
          <AppBadge :variant="reservationStatusVariant(item.status)">
            {{ t(`inventory.reservationStatus.${item.status}`) }}
          </AppBadge>
        </template>
        <template #source="{ item }">{{ item.sourceType }}</template>
        <template #actions="{ item }">
          <div
            v-if="item.status === 'ACTIVE' && authStore.checkAllPermissions(['inventory:manage'])"
            class="flex justify-end gap-2"
          >
            <AppButton
              size="small"
              variant="secondary"
              icon-only
              :title="t('inventory.actions.releaseReservation')"
              @click="openReservationTransition(item, 'release')"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">lock_open</span>
              </template>
            </AppButton>
            <AppButton
              size="small"
              variant="primary"
              icon-only
              :title="t('inventory.actions.consumeReservation')"
              @click="openReservationTransition(item, 'consume')"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
              </template>
            </AppButton>
          </div>
        </template>
      </AppTable>
    </template>

    <AppModal v-model="isWarehouseModalOpen" :title="warehouseForm.id ? t('inventory.form.editWarehouseTitle') : t('inventory.form.warehouseTitle')" size="md">
      <form class="space-y-4" novalidate @submit.prevent="saveWarehouse">
        <AppInput
          id="warehouse-code"
          v-model="warehouseForm.code"
          :label="t('inventory.form.codeLabel')"
          :error="warehouseFormErrors.code ? t(warehouseFormErrors.code) : undefined"
          :disabled="!!warehouseForm.id"
          required
          maxlength="20"
          @update:model-value="clearWarehouseFieldError('code')"
        />
        <AppInput
          id="warehouse-name"
          v-model="warehouseForm.name"
          :label="t('inventory.form.nameLabel')"
          :error="warehouseFormErrors.name ? t(warehouseFormErrors.name) : undefined"
          required
          @update:model-value="clearWarehouseFieldError('name')"
        />
        <p v-if="warehouseSubmitError" class="lf-error-message" role="alert">
          {{ t(warehouseSubmitError) }}
        </p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isWarehouseModalOpen = false">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">{{
            warehouseForm.id ? t('inventory.actions.saveWarehouse') : t('inventory.actions.createWarehouse')
          }}</AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal v-model="isReserveModalOpen" :title="t('inventory.form.reserveTitle')" size="md">
      <form class="space-y-4" @submit.prevent="reserveStock">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            id="reserve-sku"
            v-model="reserveForm.skuId"
            :label="t('inventory.form.skuIdLabel')"
          />
          <AppSelect
            id="reserve-warehouse"
            v-model="reserveForm.warehouseId"
            :label="t('inventory.form.warehouseLabel')"
            :options="warehouseOptions"
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AppNumberInput
            id="reserve-quantity"
            v-model="reserveForm.quantity"
            :allow-decimals="true"
            :label="t('inventory.form.quantityLabel')"
          />
          <AppInput
            id="reserve-source-type"
            v-model="reserveForm.sourceType"
            :label="t('inventory.form.sourceTypeLabel')"
          />
          <AppInput
            id="reserve-source-id"
            v-model="reserveForm.sourceId"
            :label="t('inventory.form.sourceIdLabel')"
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            id="reserve-reason"
            v-model="reserveForm.reasonCode"
            :label="t('inventory.form.reasonCodeLabel')"
          />
          <AppInput
            id="reserve-notes"
            v-model="reserveForm.notes"
            :label="t('inventory.form.notesLabel')"
          />
        </div>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isReserveModalOpen = false">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">{{
            t('inventory.actions.reserve')
          }}</AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      v-model="isAdjustmentModalOpen"
      :title="t('inventory.form.adjustmentTitle')"
      size="md"
    >
      <form class="space-y-4" @submit.prevent="recordAdjustment">
        <div v-if="adjustmentSubmitError" class="lf-error-message" role="alert">
          {{ t(adjustmentSubmitError) }}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            id="adjustment-sku"
            v-model="adjustmentForm.skuId"
            :label="t('inventory.form.skuIdLabel')"
            :placeholder="t('inventory.form.skuIdPlaceholder')"
            required
            @input="adjustmentSubmitError = ''"
          />
          <AppSelect
            id="adjustment-warehouse"
            v-model="adjustmentForm.warehouseId"
            :label="t('inventory.form.warehouseLabel')"
            :options="warehouseOptions"
            required
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AppNumberInput
            id="adjustment-quantity"
            v-model="adjustmentForm.quantity"
            :allow-decimals="true"
            :label="t('inventory.form.quantityLabel')"
            required
          />
          <AppInput
            id="adjustment-reason"
            v-model="adjustmentForm.reasonCode"
            :label="t('inventory.form.reasonCodeLabel')"
            class="md:col-span-2"
            required
          />
        </div>
        <AppInput
          id="adjustment-notes"
          v-model="adjustmentForm.notes"
          :label="t('inventory.form.notesLabel')"
        />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isAdjustmentModalOpen = false">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">{{
            t('inventory.actions.adjust')
          }}</AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      v-model="isTransitionModalOpen"
      :title="
        transitionMode === 'consume'
          ? t('inventory.form.consumeTitle')
          : t('inventory.form.releaseTitle')
      "
      size="md"
    >
      <form class="space-y-4" @submit.prevent="transitionReservation">
        <p v-if="selectedReservation" class="text-sm text-gray-500 dark:text-gray-400">
          {{
            t('inventory.form.reservationConfirmation', {
              quantity: selectedReservation.quantity,
              skuId: selectedReservation.skuId,
            })
          }}
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            id="reservation-transition-reason"
            v-model="transitionForm.reasonCode"
            :label="t('inventory.form.reasonCodeLabel')"
          />
          <AppInput
            id="reservation-transition-notes"
            v-model="transitionForm.notes"
            :label="t('inventory.form.notesLabel')"
          />
        </div>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isTransitionModalOpen = false">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">
            {{
              transitionMode === 'consume'
                ? t('inventory.actions.consumeReservation')
                : t('inventory.actions.releaseReservation')
            }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>
