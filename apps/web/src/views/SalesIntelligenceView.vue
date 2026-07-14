<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useSalesIntelligenceStore } from '../stores/sales-intelligence.store'
import { useAuthStore } from '../stores/auth.store'
import { useToastStore } from '../stores/toast.store'
import { salesIntelligenceService } from '../services/sales-intelligence.service'
import { formatDateTime } from '../utils/date-format'
import { formatMoneyFromCents } from '../utils/money-format'
import type {
  SalesIntelligenceNetAmountSource,
  SalesIntelligenceOrder,
  SalesIntelligenceStockStatus,
} from '../types/sales-intelligence.types'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppMetricCard from '../components/common/AppMetricCard.vue'
import AppMetricGrid from '../components/common/AppMetricGrid.vue'
import AppModal from '../components/common/AppModal.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'
import SalesIntelligenceDetailDrawer from '../components/sales-intelligence/SalesIntelligenceDetailDrawer.vue'

const { t, currentLocale } = useI18n()
const store = useSalesIntelligenceStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const selectedOrder = ref<SalesIntelligenceOrder | null>(null)
const isExporting = ref(false)
const isPolicyOpen = ref(false)
const isPolicySaving = ref(false)
const policyEnabled = ref(true)
const policyThreshold = ref('10.00')

const exportCsv = async () => {
  isExporting.value = true
  try {
    await salesIntelligenceService.exportCsv(store.filters)
    toastStore.success(t('salesIntelligence.export.ready'))
  } catch {
    toastStore.error(t('salesIntelligence.export.failed'))
  } finally {
    isExporting.value = false
  }
}

const openPolicy = async () => {
  const policy = await salesIntelligenceService.getPolicy()
  policyEnabled.value = policy.lowMarginEnabled
  policyThreshold.value = policy.lowMarginThreshold
  isPolicyOpen.value = true
}

const savePolicy = async () => {
  isPolicySaving.value = true
  try {
    await salesIntelligenceService.updatePolicy({
      lowMarginEnabled: policyEnabled.value,
      lowMarginThreshold: Number(policyThreshold.value),
    })
    toastStore.success(t('salesIntelligence.policy.saved'))
    isPolicyOpen.value = false
  } finally {
    isPolicySaving.value = false
  }
}

const openOrder = async (order: SalesIntelligenceOrder) => {
  selectedOrder.value = order
  await store.fetchDetail(order.orderId)
}

const closeOrder = () => {
  selectedOrder.value = null
  store.clearDetail()
}

const columns = computed(() => [
  { key: 'soldAt', label: t('salesIntelligence.table.soldAt') },
  { key: 'order', label: t('salesIntelligence.table.order') },
  { key: 'paymentStatus', label: t('salesIntelligence.table.payment') },
  { key: 'paidAmountMinor', label: t('salesIntelligence.table.paid'), align: 'right' as const },
  { key: 'feeAmountMinor', label: t('salesIntelligence.table.fee'), align: 'right' as const },
  { key: 'netAmountMinor', label: t('salesIntelligence.table.net'), align: 'right' as const },
  { key: 'stockStatus', label: t('salesIntelligence.table.stock') },
  { key: 'actions', label: t('salesIntelligence.table.actions'), align: 'right' as const },
])

const paymentOptions = computed(() => [
  { value: '', label: t('salesIntelligence.filters.allPayments') },
  { value: 'approved', label: t('salesIntelligence.payment.approved') },
  { value: 'pending', label: t('salesIntelligence.payment.pending') },
  { value: 'refunded', label: t('salesIntelligence.payment.refunded') },
  { value: 'cancelled', label: t('salesIntelligence.payment.cancelled') },
])

const stockOptions = computed(() => [
  { value: '', label: t('salesIntelligence.filters.allStock') },
  ...(['PENDING', 'RESERVED', 'CONSUMED', 'RELEASED', 'DIVERGENT', 'UNAVAILABLE'] as const).map(
    (value) => ({ value, label: t(`salesIntelligence.stock.${value}`) }),
  ),
])

const summaryCurrency = computed(() => store.summary?.currency ?? 'BRL')

const formatMinor = (amount?: string | null, currency: string = 'BRL') => {
  if (amount === null || amount === undefined) return t('salesIntelligence.unavailable')
  return formatMoneyFromCents(Number(amount), currency, currentLocale.value)
}

const paymentVariant = (status?: string | null) => {
  if (status === 'approved') return 'success'
  if (status === 'refunded' || status === 'cancelled') return 'danger'
  return 'warning'
}

const stockVariant = (status: SalesIntelligenceStockStatus) => {
  if (status === 'CONSUMED') return 'success'
  if (status === 'RESERVED') return 'info'
  if (status === 'DIVERGENT') return 'danger'
  if (status === 'PENDING') return 'warning'
  return 'default'
}

const netVariant = (source: SalesIntelligenceNetAmountSource) => {
  if (source === 'REALIZED') return 'success'
  if (source === 'RECONCILED') return 'info'
  if (source === 'ESTIMATED') return 'warning'
  return 'default'
}

const setPaymentStatus = (value: string) => store.setFilters({ paymentStatus: value || undefined })
const setStockStatus = (value: string) =>
  store.setFilters({
    stockStatus: (value || undefined) as SalesIntelligenceStockStatus | undefined,
  })
const setOrderReference = (value: string) =>
  store.setFilters({ orderReference: value.trim() || undefined })
const setDate = (key: 'dateFrom' | 'dateTo', value: string) =>
  store.setFilters({ [key]: value || undefined })

onMounted(() => store.fetchOverview())
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :eyebrow="t('salesIntelligence.eyebrow')"
      :title="t('salesIntelligence.title')"
      :description="t('salesIntelligence.description')"
    >
      <template #actions>
        <AppButton
          v-if="authStore.checkAllPermissions(['sales-intelligence:manage-policy'])"
          variant="secondary"
          @click="openPolicy"
        >
          {{ t('salesIntelligence.actions.settings') }}
        </AppButton>
        <AppButton
          v-if="authStore.checkAllPermissions(['sales-intelligence:export'])"
          :disabled="isExporting"
          @click="exportCsv"
        >
          {{
            isExporting
              ? t('salesIntelligence.actions.exporting')
              : t('salesIntelligence.actions.export')
          }}
        </AppButton>
      </template>
    </AppPageHeader>

    <p class="text-sm font-medium text-[var(--lf-text-secondary)]">
      {{ t('salesIntelligence.foundation.scope') }}
    </p>

    <AppErrorState
      v-if="store.error && !store.orders.length"
      :title="t('salesIntelligence.errors.title')"
      :description="t(store.error)"
      :action-label="t('common.retry')"
      show-retry
      @retry="store.fetchOverview()"
    />

    <template v-else>
      <AppMetricGrid :accessible-label="t('salesIntelligence.summary.title')">
        <AppMetricCard
          :label="t('salesIntelligence.summary.orders')"
          :value="
            t('salesIntelligence.summary.orderCount', { count: store.summary?.orderCount ?? 0 })
          "
        />
        <AppMetricCard
          :label="t('salesIntelligence.summary.paid')"
          :value="formatMinor(store.summary?.paidAmountMinor ?? '0', summaryCurrency)"
        />
        <AppMetricCard
          :label="t('salesIntelligence.summary.fees')"
          :value="formatMinor(store.summary?.feeAmountMinor ?? '0', summaryCurrency)"
        />
        <AppMetricCard
          :label="t('salesIntelligence.summary.net')"
          :value="formatMinor(store.summary?.netAmountMinor ?? '0', summaryCurrency)"
        />
        <AppMetricCard
          :label="t('salesIntelligence.summary.stockIssues')"
          :value="store.summary?.stockIssueCount ?? 0"
        />
      </AppMetricGrid>

      <AppCard>
        <div class="sales-filters">
          <AppInput
            :model-value="store.filters.orderReference"
            :label="t('salesIntelligence.filters.orderReference')"
            :placeholder="t('salesIntelligence.filters.orderPlaceholder')"
            name="sales-order-reference"
            autocomplete="off"
            @change="setOrderReference(($event.target as HTMLInputElement).value)"
          />
          <AppSelect
            :model-value="store.filters.paymentStatus || ''"
            :label="t('salesIntelligence.filters.payment')"
            :options="paymentOptions"
            name="sales-payment-status"
            autocomplete="off"
            data-testid="sales-payment-filter"
            @update:model-value="setPaymentStatus"
          />
          <AppSelect
            :model-value="store.filters.stockStatus || ''"
            :label="t('salesIntelligence.filters.stock')"
            :options="stockOptions"
            name="sales-stock-status"
            autocomplete="off"
            @update:model-value="setStockStatus"
          />
          <AppInput
            :model-value="store.filters.dateFrom"
            type="date"
            :label="t('salesIntelligence.filters.dateFrom')"
            name="sales-date-from"
            autocomplete="off"
            @change="setDate('dateFrom', ($event.target as HTMLInputElement).value)"
          />
          <AppInput
            :model-value="store.filters.dateTo"
            type="date"
            :label="t('salesIntelligence.filters.dateTo')"
            name="sales-date-to"
            autocomplete="off"
            @change="setDate('dateTo', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </AppCard>

      <AppTable
        :columns="columns"
        :items="store.orders"
        :is-loading="store.isLoading"
        :empty-title="t('salesIntelligence.empty.title')"
        :empty-description="t('salesIntelligence.empty.description')"
        :pagination="store.meta"
        @update:page="store.setPage"
      >
        <template #soldAt="{ item }">
          <span class="whitespace-nowrap">{{ formatDateTime(item.soldAt, currentLocale) }}</span>
        </template>
        <template #order="{ item }">
          <div class="space-y-1">
            <p class="break-words font-semibold text-[var(--lf-text-primary)]" translate="no">
              {{ item.orderNumber }}
            </p>
            <p class="text-xs text-[var(--lf-text-secondary)]">
              {{ item.externalOrderId || t('salesIntelligence.unavailable') }} ·
              {{ t(`salesIntelligence.orderStatus.${item.orderStatus}`) }}
            </p>
          </div>
        </template>
        <template #paymentStatus="{ item }">
          <AppBadge :variant="paymentVariant(item.paymentStatus)">
            {{ t(`salesIntelligence.payment.${item.paymentStatus || 'unavailable'}`) }}
          </AppBadge>
        </template>
        <template #paidAmountMinor="{ item }">
          <span class="sales-money">{{ formatMinor(item.paidAmountMinor, item.currency) }}</span>
        </template>
        <template #feeAmountMinor="{ item }">
          <span class="sales-money">{{ formatMinor(item.feeAmountMinor, item.currency) }}</span>
        </template>
        <template #netAmountMinor="{ item }">
          <div class="flex flex-col items-end gap-1">
            <span class="sales-money font-semibold">{{
              formatMinor(item.netAmountMinor, item.currency)
            }}</span>
            <AppBadge :variant="netVariant(item.netAmountSource)">
              {{ t(`salesIntelligence.netSource.${item.netAmountSource}`) }}
            </AppBadge>
          </div>
        </template>
        <template #stockStatus="{ item }">
          <AppBadge :variant="stockVariant(item.stockStatus)">
            {{ t(`salesIntelligence.stock.${item.stockStatus}`) }}
          </AppBadge>
        </template>
        <template #actions="{ item }">
          <AppButton
            variant="secondary"
            size="small"
            :data-testid="`sales-order-details-${item.orderId}`"
            @click="openOrder(item)"
          >
            {{ t('salesIntelligence.actions.details') }}
          </AppButton>
        </template>
      </AppTable>
    </template>

    <SalesIntelligenceDetailDrawer
      :model-value="Boolean(selectedOrder)"
      :order-number="selectedOrder?.orderNumber ?? ''"
      :detail="store.detail"
      :timeline="store.timeline"
      :is-loading="store.isDetailLoading"
      @update:model-value="$event ? undefined : closeOrder()"
    />

    <AppModal
      v-model="isPolicyOpen"
      :title="t('salesIntelligence.policy.title')"
      size="sm"
    >
      <div class="space-y-5">
        <label class="flex items-center gap-3 text-sm text-[var(--lf-text-primary)]">
          <input v-model="policyEnabled" type="checkbox" />
          {{ t('salesIntelligence.policy.enabled') }}
        </label>
        <AppInput
          :model-value="policyThreshold"
          type="number"
          min="0"
          max="100"
          step="0.01"
          :disabled="!policyEnabled"
          :label="t('salesIntelligence.policy.threshold')"
          name="sales-low-margin-threshold"
          @input="policyThreshold = ($event.target as HTMLInputElement).value"
        />
      </div>
      <template #footer>
        <AppButton :disabled="isPolicySaving" @click="savePolicy">
          {{ t('salesIntelligence.policy.save') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.sales-filters {
  display: grid;
  gap: var(--lf-space-4);
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  align-items: end;
}

.sales-money {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
