<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useOrdersStore } from '../stores/orders.store'
import { formatDateTime } from '../utils/date-format'
import type { InternalOrder, InternalOrderStatus } from '../types/orders.types'
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
const ordersStore = useOrdersStore()

const isCreateModalOpen = ref(false)
const isTransitionModalOpen = ref(false)
const selectedOrder = ref<InternalOrder | null>(null)
const transitionAction = ref<'confirm' | 'cancel' | 'fulfill'>('confirm')

const orderForm = reactive({
  customerName: '',
  notes: '',
  items: [{ skuId: '', warehouseId: '', quantity: '1' }],
})

const transitionForm = reactive({
  reasonCode: '',
  notes: '',
})

const columns = computed(() => [
  { key: 'orderNumber', label: t('orders.table.orderNumber') },
  { key: 'status', label: t('orders.table.status') },
  { key: 'customerName', label: t('orders.table.customer') },
  { key: 'items', label: t('orders.table.items') },
  { key: 'createdAt', label: t('orders.table.createdAt') },
  { key: 'actions', label: t('orders.table.actions'), align: 'right' as const },
])

const statusOptions = computed(() => [
  { value: '', label: t('orders.filters.statusAll') },
  { value: 'DRAFT', label: t('orders.status.DRAFT') },
  { value: 'CONFIRMED', label: t('orders.status.CONFIRMED') },
  { value: 'CANCELLED', label: t('orders.status.CANCELLED') },
  { value: 'FULFILLED', label: t('orders.status.FULFILLED') },
])

onMounted(() => {
  ordersStore.fetchOrders()
})

const addItem = () => {
  orderForm.items.push({ skuId: '', warehouseId: '', quantity: '1' })
}

const removeItem = (index: number) => {
  if (orderForm.items.length === 1) return
  orderForm.items.splice(index, 1)
}

const resetCreateForm = () => {
  orderForm.customerName = ''
  orderForm.notes = ''
  orderForm.items = [{ skuId: '', warehouseId: '', quantity: '1' }]
}

const createOrder = async () => {
  await ordersStore.createOrder({
    idempotencyKey: `create-order-${crypto.randomUUID()}`,
    customerName: orderForm.customerName || undefined,
    notes: orderForm.notes || undefined,
    items: orderForm.items.map((item) => ({
      skuId: item.skuId,
      warehouseId: item.warehouseId,
      quantity: Number(item.quantity),
    })),
  })
  resetCreateForm()
  isCreateModalOpen.value = false
}

const openTransition = (order: InternalOrder, action: 'confirm' | 'cancel' | 'fulfill') => {
  selectedOrder.value = order
  transitionAction.value = action
  transitionForm.reasonCode =
    action === 'confirm'
      ? 'ORDER_CONFIRMED'
      : action === 'cancel'
        ? 'ORDER_CANCELLED'
        : 'ORDER_FULFILLED'
  transitionForm.notes = ''
  isTransitionModalOpen.value = true
}

const transitionOrder = async () => {
  if (!selectedOrder.value) return
  await ordersStore.transitionOrder(selectedOrder.value.id, transitionAction.value, {
    reasonCode: transitionForm.reasonCode,
    notes: transitionForm.notes || undefined,
    idempotencyKey: `${transitionAction.value}-${selectedOrder.value.id}`,
  })
  selectedOrder.value = null
  transitionForm.reasonCode = ''
  transitionForm.notes = ''
  isTransitionModalOpen.value = false
}

const statusVariant = (status: InternalOrderStatus) => {
  if (status === 'CONFIRMED') return 'info'
  if (status === 'FULFILLED') return 'success'
  if (status === 'CANCELLED') return 'default'
  return 'warning'
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader :title="t('orders.title')" :description="t('orders.description')">
      <template #actions>
        <AppButton
          v-if="authStore.checkAllPermissions(['orders:manage'])"
          variant="primary"
          @click="isCreateModalOpen = true"
        >
          {{ t('orders.actions.create') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="ordersStore.error && !ordersStore.orders.length"
      :title="t('orders.errors.title')"
      :description="t(ordersStore.error)"
      @retry="ordersStore.fetchOrders()"
    />

    <template v-else>
      <AppCard>
        <div class="filters-row">
          <div class="filter-item">
            <AppSelect
              id="orders-status"
              :model-value="ordersStore.filters.status || ''"
              :label="t('orders.filters.statusLabel')"
              :options="statusOptions"
              @update:model-value="
                ordersStore.setStatus(($event || undefined) as InternalOrderStatus | undefined)
              "
            />
          </div>
        </div>
      </AppCard>

      <AppTable
        :columns="columns"
        :items="ordersStore.orders"
        :is-loading="ordersStore.isLoading"
        :empty-title="t('orders.empty.title')"
        :empty-description="t('orders.empty.description')"
      >
        <template #status="{ item }">
          <AppBadge :variant="statusVariant(item.status)">
            {{ t(`orders.status.${item.status}`) }}
          </AppBadge>
        </template>

        <template #customerName="{ item }">
          {{ item.customerName || '-' }}
        </template>

        <template #items="{ item }">
          <div class="space-y-1 text-sm">
            <div v-for="orderItem in item.items" :key="orderItem.id">
              <span class="font-mono">{{ orderItem.skuId }}</span>
              <span> / {{ orderItem.warehouseId }} / {{ orderItem.quantity }}</span>
            </div>
          </div>
        </template>

        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>

        <template #actions="{ item }">
          <div
            v-if="authStore.checkAllPermissions(['orders:manage'])"
            class="flex justify-end gap-2"
          >
            <AppButton
              v-if="item.status === 'DRAFT'"
              size="small"
              variant="primary"
              @click="openTransition(item, 'confirm')"
            >
              {{ t('orders.actions.confirm') }}
            </AppButton>
            <AppButton
              v-if="item.status === 'CONFIRMED'"
              size="small"
              variant="primary"
              @click="openTransition(item, 'fulfill')"
            >
              {{ t('orders.actions.fulfill') }}
            </AppButton>
            <AppButton
              v-if="item.status === 'DRAFT' || item.status === 'CONFIRMED'"
              size="small"
              variant="secondary"
              @click="openTransition(item, 'cancel')"
            >
              {{ t('orders.actions.cancel') }}
            </AppButton>
          </div>
        </template>
      </AppTable>

      <div v-if="ordersStore.totalPages > 1" class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{
            t('orders.pagination.pageOf', {
              page: ordersStore.currentPage,
              totalPages: ordersStore.totalPages,
            })
          }}
        </div>
        <div class="flex gap-2">
          <AppButton
            variant="secondary"
            size="small"
            :disabled="ordersStore.currentPage <= 1 || ordersStore.isLoading"
            @click="ordersStore.setPage(ordersStore.currentPage - 1)"
          >
            {{ t('orders.pagination.previous') }}
          </AppButton>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="ordersStore.currentPage >= ordersStore.totalPages || ordersStore.isLoading"
            @click="ordersStore.setPage(ordersStore.currentPage + 1)"
          >
            {{ t('orders.pagination.next') }}
          </AppButton>
        </div>
      </div>
    </template>

    <AppModal v-model="isCreateModalOpen" :title="t('orders.form.createTitle')" size="lg">
      <form class="space-y-4" @submit.prevent="createOrder">
        <AppInput
          id="order-customer-name"
          v-model="orderForm.customerName"
          :label="t('orders.form.customerNameLabel')"
        />
        <AppInput id="order-notes" v-model="orderForm.notes" :label="t('orders.form.notesLabel')" />

        <div class="space-y-3">
          <div
            v-for="(item, index) in orderForm.items"
            :key="index"
            class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_140px_auto]"
          >
            <AppInput
              :id="`order-item-sku-${index}`"
              v-model="item.skuId"
              :label="t('orders.form.skuIdLabel')"
            />
            <AppInput
              :id="`order-item-warehouse-${index}`"
              v-model="item.warehouseId"
              :label="t('orders.form.warehouseIdLabel')"
            />
            <AppInput
              :id="`order-item-quantity-${index}`"
              v-model="item.quantity"
              type="number"
              min="0.000001"
              step="0.000001"
              :label="t('orders.form.quantityLabel')"
            />
            <div class="flex items-end">
              <AppButton type="button" variant="secondary" @click="removeItem(index)">
                {{ t('orders.actions.removeItem') }}
              </AppButton>
            </div>
          </div>
        </div>

        <AppButton type="button" variant="secondary" @click="addItem">
          {{ t('orders.actions.addItem') }}
        </AppButton>

        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isCreateModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="ordersStore.isMutating">
            {{ t('orders.actions.create') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      v-model="isTransitionModalOpen"
      :title="t(`orders.form.${transitionAction}Title`)"
      size="md"
    >
      <form class="space-y-4" @submit.prevent="transitionOrder">
        <p v-if="selectedOrder" class="text-sm text-[var(--lf-text-secondary)]">
          {{
            t('orders.form.transitionConfirmation', {
              orderNumber: selectedOrder.orderNumber,
            })
          }}
        </p>
        <AppInput
          id="order-transition-reason"
          v-model="transitionForm.reasonCode"
          :label="t('orders.form.reasonCodeLabel')"
        />
        <AppInput
          id="order-transition-notes"
          v-model="transitionForm.notes"
          :label="t('orders.form.notesLabel')"
        />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isTransitionModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="ordersStore.isMutating">
            {{ t(`orders.actions.${transitionAction}`) }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>
