<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { formatDateTime } from '../../utils/date-format'
import { formatMoneyFromCents } from '../../utils/money-format'
import type {
  SalesIntelligenceDetail,
  SalesTimelineEvent,
} from '../../types/sales-intelligence.types'
import AppBadge from '../common/AppBadge.vue'
import AppDrawer from '../common/AppDrawer.vue'

const props = defineProps<{
  modelValue: boolean
  orderNumber: string
  detail: SalesIntelligenceDetail | null
  timeline: SalesTimelineEvent[]
  isLoading: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t, currentLocale } = useI18n()
const currency = computed(() => props.detail?.currency ?? 'BRL')
const money = (value?: string | null) =>
  value == null
    ? t('salesIntelligence.unavailable')
    : formatMoneyFromCents(Number(value), currency.value, currentLocale.value)
const percent = (value?: string | null) =>
  value == null
    ? t('salesIntelligence.unavailable')
    : `${new Intl.NumberFormat(currentLocale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}%`
const badgeVariant = (status?: string | null) => {
  if (['PROFIT', 'DELIVERED', 'RECONCILED', 'REALIZED', 'CONSUMED'].includes(status ?? ''))
    return 'success'
  if (['LOSS', 'DIVERGENT', 'DELAYED', 'BLOCKED'].includes(status ?? '')) return 'danger'
  if (['MISSING_COST', 'PENDING', 'PENDING_RELEASE'].includes(status ?? '')) return 'warning'
  return 'default'
}
</script>

<template>
  <AppDrawer
    :model-value="modelValue"
    :title="t('salesIntelligence.drawer.title', { order: orderNumber })"
    data-testid="sales-order-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p v-if="isLoading" class="text-sm text-[var(--lf-text-secondary)]">
      {{ t('common.loading') }}
    </p>
    <div v-else-if="detail" class="space-y-6">
      <section class="sales-detail-grid" :aria-label="t('salesIntelligence.drawer.financial')">
        <div class="sales-detail-card">
          <span>{{ t('salesIntelligence.table.net') }}</span>
          <strong>{{ money(detail.financial.netAmountMinor) }}</strong>
          <AppBadge :variant="badgeVariant(detail.financial.netAmountSource)">
            {{ t(`salesIntelligence.netSource.${detail.financial.netAmountSource}`) }}
          </AppBadge>
        </div>
        <div v-if="detail.permissions.canViewProfitability" class="sales-detail-card">
          <span>{{ t('salesIntelligence.drawer.cogs') }}</span>
          <strong>{{ money(detail.financial.cogsAmountMinor) }}</strong>
          <small>{{ t(`salesIntelligence.profitSource.${detail.financial.profitSource}`) }}</small>
        </div>
        <div v-if="detail.permissions.canViewProfitability" class="sales-detail-card">
          <span>{{ t('salesIntelligence.drawer.profit') }}</span>
          <strong>{{
            money(detail.financial.realizedProfitMinor ?? detail.financial.estimatedProfitMinor)
          }}</strong>
          <AppBadge :variant="badgeVariant(detail.financial.profitabilityStatus)">
            {{ t(`salesIntelligence.profitability.${detail.financial.profitabilityStatus}`) }}
          </AppBadge>
        </div>
        <div v-if="detail.permissions.canViewProfitability" class="sales-detail-card">
          <span>{{ t('salesIntelligence.drawer.margin') }}</span>
          <strong>{{ percent(detail.financial.marginPercent) }}</strong>
        </div>
      </section>

      <section>
        <h3 class="sales-section-title">{{ t('salesIntelligence.drawer.items') }}</h3>
        <ul class="space-y-3">
          <li v-for="item in detail.items" :key="item.orderItemId" class="sales-item-card">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="font-semibold text-[var(--lf-text-primary)]">
                  {{ item.productName || t('salesIntelligence.drawer.productUnavailable') }}
                </p>
                <p
                  class="mt-1 break-all font-mono text-sm text-[var(--lf-text-secondary)]"
                  translate="no"
                >
                  {{ item.sku || t('salesIntelligence.unavailable') }}
                </p>
                <p v-if="item.warehouseName" class="mt-1 text-sm text-[var(--lf-text-secondary)]">
                  {{ item.warehouseName }} · {{ item.warehouseCode }}
                </p>
              </div>
              <AppBadge v-if="item.stockStatus" :variant="badgeVariant(item.stockStatus)">
                {{ t(`salesIntelligence.stock.${item.stockStatus}`) }}
              </AppBadge>
            </div>
            <div
              class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--lf-text-secondary)]"
            >
              <span>{{ t('salesIntelligence.drawer.quantity', { quantity: item.quantity }) }}</span>
              <span v-if="detail.permissions.canViewProfitability">
                {{ t('salesIntelligence.drawer.itemCogs') }}: {{ money(item.cogsAmountMinor) }}
              </span>
            </div>
          </li>
        </ul>
      </section>

      <section class="sales-status-grid">
        <div class="sales-detail-card">
          <span>{{ t('salesIntelligence.drawer.shipping') }}</span>
          <AppBadge :variant="badgeVariant(detail.shipping.status)">
            {{ t(`salesIntelligence.shipping.${detail.shipping.status}`) }}
          </AppBadge>
          <small v-if="detail.shipping.trackingCodeMasked" translate="no">{{
            detail.shipping.trackingCodeMasked
          }}</small>
        </div>
        <div v-if="detail.settlement" class="sales-detail-card">
          <span>{{ t('salesIntelligence.drawer.settlement') }}</span>
          <AppBadge :variant="badgeVariant(detail.settlement.status)">
            {{ t(`salesIntelligence.settlement.${detail.settlement.status}`) }}
          </AppBadge>
          <small>{{ t(`salesIntelligence.cash.${detail.settlement.cashStatus}`) }}</small>
        </div>
      </section>

      <section>
        <h3 class="sales-section-title">{{ t('salesIntelligence.drawer.timeline') }}</h3>
        <ol class="sales-timeline">
          <li v-for="event in timeline" :key="event.id">
            <span class="sales-timeline-dot" aria-hidden="true" />
            <div>
              <p class="font-medium text-[var(--lf-text-primary)]">{{ t(event.titleKey) }}</p>
              <p class="text-sm text-[var(--lf-text-secondary)]">{{ t(event.messageKey) }}</p>
              <time class="text-xs text-[var(--lf-text-muted)]">{{
                formatDateTime(event.occurredAt, currentLocale)
              }}</time>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </AppDrawer>
</template>

<style scoped>
.sales-detail-grid,
.sales-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--lf-space-3);
}
.sales-detail-card,
.sales-item-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--lf-space-2);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  background: var(--lf-surface-secondary);
  padding: var(--lf-space-4);
}
.sales-detail-card > span,
.sales-detail-card > small {
  color: var(--lf-text-secondary);
  font-size: 0.75rem;
}
.sales-detail-card > strong {
  color: var(--lf-text-primary);
  font-variant-numeric: tabular-nums;
}
.sales-section-title {
  margin-bottom: var(--lf-space-3);
  color: var(--lf-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
}
.sales-timeline {
  margin-inline-start: var(--lf-space-2);
  border-inline-start: 1px solid var(--lf-border-primary);
}
.sales-timeline li {
  position: relative;
  padding: 0 0 var(--lf-space-5) var(--lf-space-5);
}
.sales-timeline-dot {
  position: absolute;
  inset-inline-start: -0.3125rem;
  top: 0.25rem;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 999px;
  background: var(--lf-primary);
}
@media (max-width: 640px) {
  .sales-detail-grid,
  .sales-status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
