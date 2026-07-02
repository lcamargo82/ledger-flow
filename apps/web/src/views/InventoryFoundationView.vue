<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useInventoryStore } from '../stores/inventory.store'
import { formatDateTime } from '../utils/date-format'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppModal from '../components/common/AppModal.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'

const { t, currentLocale } = useI18n()
const authStore = useAuthStore()
const inventoryStore = useInventoryStore()
const route = useRoute()
const router = useRouter()

type InventoryTab = 'warehouses' | 'balances' | 'movements'

const getTabFromRoute = (): InventoryTab => {
  if (route.name === 'inventory-warehouses') return 'warehouses'
  if (route.name === 'inventory-movements') return 'movements'
  return 'balances'
}

const activeTab = ref<InventoryTab>(getTabFromRoute())
const isWarehouseModalOpen = ref(false)
const isAdjustmentModalOpen = ref(false)

const warehouseForm = reactive({ code: '', name: '' })
const adjustmentForm = reactive({
  skuId: '',
  warehouseId: '',
  type: 'ADJUSTMENT_IN' as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT',
  quantity: '1',
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
  { key: 'skuId', label: t('inventory.table.skuId') },
  { key: 'warehouseId', label: t('inventory.table.warehouseId') },
  { key: 'onHandQuantity', label: t('inventory.table.onHand') },
  { key: 'reservedQuantity', label: t('inventory.table.reserved') },
  { key: 'availableQuantity', label: t('inventory.table.available') },
  { key: 'updatedAt', label: t('inventory.table.updatedAt') },
])

const movementColumns = computed(() => [
  { key: 'occurredAt', label: t('inventory.table.occurredAt') },
  { key: 'type', label: t('inventory.table.type') },
  { key: 'skuId', label: t('inventory.table.skuId') },
  { key: 'warehouseId', label: t('inventory.table.warehouseId') },
  { key: 'quantityDelta', label: t('inventory.table.quantity') },
  { key: 'reasonCode', label: t('inventory.table.reason') },
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
  }

  activeTab.value = tab
  router.push({ name: routeNameByTab[tab] })
}

const createWarehouse = async () => {
  await inventoryStore.createWarehouse({
    code: warehouseForm.code,
    name: warehouseForm.name,
  })
  warehouseForm.code = ''
  warehouseForm.name = ''
  isWarehouseModalOpen.value = false
}

const toggleWarehouse = async (id: string, isActive: boolean) => {
  await inventoryStore.updateWarehouse(id, { isActive: !isActive })
}

const recordAdjustment = async () => {
  await inventoryStore.recordAdjustment({
    skuId: adjustmentForm.skuId,
    warehouseId: adjustmentForm.warehouseId,
    type: adjustmentForm.type,
    quantity: Number(adjustmentForm.quantity),
    reasonCode: adjustmentForm.reasonCode,
    notes: adjustmentForm.notes || undefined,
  })
  adjustmentForm.skuId = ''
  adjustmentForm.warehouseId = ''
  adjustmentForm.quantity = '1'
  adjustmentForm.reasonCode = ''
  adjustmentForm.notes = ''
  isAdjustmentModalOpen.value = false
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
            @click="isWarehouseModalOpen = true"
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
          <AppButton
            v-if="authStore.checkAllPermissions(['inventory:manage'])"
            size="small"
            variant="secondary"
            @click="toggleWarehouse(item.id, item.isActive)"
          >
            {{ item.isActive ? t('inventory.actions.disable') : t('inventory.actions.enable') }}
          </AppButton>
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
        <template #occurredAt="{ item }">
          {{ formatDateTime(item.occurredAt, currentLocale) }}
        </template>
        <template #type="{ item }">
          <AppBadge variant="info">{{ t(`inventory.movementType.${item.type}`) }}</AppBadge>
        </template>
      </AppTable>
    </template>

    <AppModal v-model="isWarehouseModalOpen" :title="t('inventory.form.warehouseTitle')" size="md">
      <form class="space-y-4" @submit.prevent="createWarehouse">
        <AppInput
          id="warehouse-code"
          v-model="warehouseForm.code"
          :label="t('inventory.form.codeLabel')"
        />
        <AppInput
          id="warehouse-name"
          v-model="warehouseForm.name"
          :label="t('inventory.form.nameLabel')"
        />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isWarehouseModalOpen = false">{{
            t('common.cancel')
          }}</AppButton>
          <AppButton type="submit" variant="primary" :loading="inventoryStore.isMutating">{{
            t('inventory.actions.createWarehouse')
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
        <AppInput
          id="adjustment-sku"
          v-model="adjustmentForm.skuId"
          :label="t('inventory.form.skuIdLabel')"
        />
        <AppSelect
          id="adjustment-warehouse"
          v-model="adjustmentForm.warehouseId"
          :label="t('inventory.form.warehouseLabel')"
          :options="warehouseOptions"
        />
        <AppSelect
          id="adjustment-type"
          v-model="adjustmentForm.type"
          :label="t('inventory.form.typeLabel')"
          :options="movementTypeOptions"
        />
        <AppInput
          id="adjustment-quantity"
          v-model="adjustmentForm.quantity"
          type="number"
          min="0.000001"
          step="0.000001"
          :label="t('inventory.form.quantityLabel')"
        />
        <AppInput
          id="adjustment-reason"
          v-model="adjustmentForm.reasonCode"
          :label="t('inventory.form.reasonCodeLabel')"
        />
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
  </div>
</template>
