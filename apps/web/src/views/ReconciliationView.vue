<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '../components/common/AppButton.vue'
import AppEmptyState from '../components/common/AppEmptyState.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppLoading from '../components/common/AppLoading.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppTable from '../components/common/AppTable.vue'
import ReconciliationDecisionModal from '../components/reconciliation/ReconciliationDecisionModal.vue'
import { useI18n } from '../composables/useI18n'
import { useReconciliationStore } from '../stores/reconciliation.store'
import { formatDateTime } from '../utils/date-format'
import { formatMoneyFromCents } from '../utils/money-format'
import type {
  CreateReconciliationDecisionPayload,
  ReconciliationCase,
} from '../types/reconciliation.types'

const { t, getLocale } = useI18n()
const reconciliationStore = useReconciliationStore()
const selectedCase = ref<ReconciliationCase | null>(null)
const isDecisionModalOpen = ref(false)

const hasCases = computed(() => reconciliationStore.cases.length > 0)
const caseColumns = computed(() => [
  { key: 'id', label: t('reconciliation.table.case') },
  { key: 'status', label: t('reconciliation.table.status') },
  { key: 'provider', label: t('reconciliation.table.provider') },
  { key: 'received', label: t('reconciliation.table.received') },
  { key: 'difference', label: t('reconciliation.table.difference') },
  { key: 'reference', label: t('reconciliation.table.reference') },
  { key: 'createdAt', label: t('reconciliation.table.createdAt') },
  { key: 'actions', label: t('reconciliation.table.actions'), align: 'right' as const },
])
const maxAgingCount = computed(() => {
  const buckets = reconciliationStore.dashboard?.agingBuckets ?? []
  return Math.max(1, ...buckets.map((bucket) => bucket.count))
})
const finalStatuses = new Set([
  'AUTO_MATCHED',
  'MANUALLY_MATCHED',
  'RECONCILED',
  'IGNORED',
  'RESOLVED_EXCEPTION',
])

onMounted(() => {
  reconciliationStore.fetchOverview()
})

const openDecisionModal = (reconciliationCase: ReconciliationCase) => {
  selectedCase.value = reconciliationCase
  isDecisionModalOpen.value = true
  reconciliationStore.fetchReviewContext(reconciliationCase.id)
}

const submitDecision = async (payload: CreateReconciliationDecisionPayload) => {
  if (!selectedCase.value) return
  await reconciliationStore.createDecision(selectedCase.value.id, payload)
  isDecisionModalOpen.value = false
}

const formatMinor = (value?: string | null, currency = 'BRL') => {
  if (!value) return '-'
  return formatMoneyFromCents(Number(value), currency, getLocale())
}

const referenceLabel = (item: ReconciliationCase) => {
  if (item.payment?.reference) return item.payment.reference
  if (item.order?.orderNumber) return `${t('reconciliation.table.order')} ${item.order.orderNumber}`
  return item.settlementEvent.externalReference ?? '-'
}

const reviewActionLabel = (item: ReconciliationCase) =>
  finalStatuses.has(item.status)
    ? t('reconciliation.actions.viewHistory')
    : t('reconciliation.actions.review')

const agingWidth = (count: number) => `${Math.max(4, (count / maxAgingCount.value) * 100)}%`
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="t('reconciliation.title')"
      :description="t('reconciliation.description')"
    />

    <AppLoading v-if="reconciliationStore.isLoading" />

    <AppErrorState
      v-else-if="reconciliationStore.error"
      :title="t(reconciliationStore.error)"
      show-retry
      @retry="reconciliationStore.fetchOverview"
    />

    <div v-else class="lf-reconciliation-panel">
      <div v-if="reconciliationStore.dashboard" class="lf-reconciliation-dashboard">
        <div class="lf-reconciliation-note">
          {{ t('reconciliation.dashboard.note') }}
        </div>

        <div class="lf-kpi-grid">
          <section class="lf-kpi">
            <span>{{ t('reconciliation.dashboard.expected') }}</span>
            <strong>{{
              formatMinor(reconciliationStore.dashboard.kpis.expectedAmountMinor)
            }}</strong>
            <small
              >{{ reconciliationStore.dashboard.kpis.totalCases }}
              {{ t('reconciliation.dashboard.cases') }}</small
            >
          </section>
          <section class="lf-kpi">
            <span>{{ t('reconciliation.dashboard.reconciled') }}</span>
            <strong>{{
              formatMinor(reconciliationStore.dashboard.kpis.reconciledAmountMinor)
            }}</strong>
            <small
              >{{ reconciliationStore.dashboard.kpis.reconciledCases }}
              {{ t('reconciliation.dashboard.cases') }}</small
            >
          </section>
          <section class="lf-kpi">
            <span>{{ t('reconciliation.dashboard.pending') }}</span>
            <strong>{{
              formatMinor(reconciliationStore.dashboard.kpis.pendingAmountMinor)
            }}</strong>
            <small
              >{{ reconciliationStore.dashboard.kpis.pendingCases }}
              {{ t('reconciliation.dashboard.cases') }}</small
            >
          </section>
          <section class="lf-kpi">
            <span>{{ t('reconciliation.dashboard.divergent') }}</span>
            <strong>{{
              formatMinor(reconciliationStore.dashboard.kpis.divergentAmountMinor)
            }}</strong>
            <small
              >{{ reconciliationStore.dashboard.kpis.divergentCases }}
              {{ t('reconciliation.dashboard.cases') }}</small
            >
          </section>
        </div>

        <div class="lf-reconciliation-breakdowns">
          <section class="lf-breakdown">
            <h2>{{ t('reconciliation.dashboard.aging') }}</h2>
            <div
              v-for="bucket in reconciliationStore.dashboard.agingBuckets"
              :key="bucket.key"
              class="lf-aging-row"
            >
              <span>{{ bucket.label }}</span>
              <div class="lf-aging-track">
                <div class="lf-aging-bar" :style="{ width: agingWidth(bucket.count) }"></div>
              </div>
              <strong>{{ bucket.count }}</strong>
            </div>
          </section>

          <section class="lf-breakdown">
            <h2>{{ t('reconciliation.dashboard.providers') }}</h2>
            <div
              v-for="provider in reconciliationStore.dashboard.byProvider"
              :key="provider.provider"
              class="lf-breakdown-line"
            >
              <span>{{ provider.provider }}</span>
              <strong>{{ formatMinor(provider.receivedAmountMinor) }}</strong>
            </div>
          </section>

          <section class="lf-breakdown">
            <h2>{{ t('reconciliation.dashboard.statuses') }}</h2>
            <div
              v-for="status in reconciliationStore.dashboard.byStatus"
              :key="status.status"
              class="lf-breakdown-line"
            >
              <span>{{ status.status }}</span>
              <strong>{{ status.count }}</strong>
            </div>
          </section>
        </div>
      </div>

      <AppEmptyState
        v-if="!hasCases"
        :title="t('reconciliation.empty.title')"
        :description="t('reconciliation.empty.description')"
      />

      <template v-else>
        <div class="lf-reconciliation-summary">
          <span>{{ t('reconciliation.summary.total') }}</span>
          <strong>{{ reconciliationStore.meta.total }}</strong>
        </div>

        <AppTable
          :columns="caseColumns"
          :items="reconciliationStore.cases"
          :pagination="reconciliationStore.meta"
          @update:page="reconciliationStore.setPage"
        >
          <template #id="{ item }">
            <span class="lf-mono">{{ item.id }}</span>
          </template>
          <template #status="{ item }">
            <span class="lf-status-pill">{{ item.status }}</span>
          </template>
          <template #received="{ item }">
            {{ formatMinor(item.receivedAmountMinor, item.currency) }}
          </template>
          <template #difference="{ item }">
            {{ formatMinor(item.differenceAmountMinor, item.currency) }}
          </template>
          <template #reference="{ item }">
            <span>{{ referenceLabel(item) }}</span>
            <small v-if="item.order" class="block">{{ item.order.status }}</small>
          </template>
          <template #createdAt="{ item }">
            {{ formatDateTime(item.createdAt, getLocale()) }}
          </template>
          <template #actions="{ item }">
            <AppButton
              size="small"
              variant="secondary"
              data-testid="open-decision-modal"
              @click="openDecisionModal(item)"
            >
              {{ reviewActionLabel(item) }}
            </AppButton>
          </template>
        </AppTable>
      </template>
    </div>

    <ReconciliationDecisionModal
      v-model="isDecisionModalOpen"
      :reconciliation-case="selectedCase"
      :timeline="reconciliationStore.selectedTimeline"
      :reason-codes="reconciliationStore.reasonCodes"
      :loading="reconciliationStore.isMutating || reconciliationStore.isReviewLoading"
      @submit="submitDecision"
    />
  </div>
</template>

<style scoped>
.lf-reconciliation-panel {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

.lf-reconciliation-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

.lf-reconciliation-note {
  padding: var(--lf-space-3);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  color: var(--lf-text-muted);
  font-size: 0.875rem;
}

.lf-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--lf-space-3);
}

.lf-kpi {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-1);
  padding: var(--lf-space-4);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
}

.lf-kpi span,
.lf-kpi small {
  color: var(--lf-text-muted);
  font-size: 0.8125rem;
}

.lf-kpi strong {
  color: var(--lf-text-primary);
  font-size: 1.25rem;
}

.lf-reconciliation-breakdowns {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: var(--lf-space-3);
}

.lf-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-3);
  padding: var(--lf-space-4);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
}

.lf-breakdown h2 {
  margin: 0;
  color: var(--lf-text-primary);
  font-size: 0.9375rem;
}

.lf-aging-row,
.lf-breakdown-line {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: var(--lf-space-3);
  align-items: center;
  color: var(--lf-text-muted);
  font-size: 0.8125rem;
}

.lf-breakdown-line {
  grid-template-columns: 1fr auto;
}

.lf-aging-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.lf-aging-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--lf-primary);
}

.lf-reconciliation-summary {
  display: flex;
  align-items: center;
  gap: var(--lf-space-2);
  color: var(--lf-text-muted);
}

.lf-reconciliation-summary strong {
  color: var(--lf-text-primary);
}

.lf-reconciliation-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
}

.lf-reconciliation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.lf-reconciliation-table th,
.lf-reconciliation-table td {
  padding: var(--lf-space-3);
  border-bottom: 1px solid var(--lf-border-primary);
  text-align: left;
  white-space: nowrap;
}

.lf-reconciliation-table th {
  color: var(--lf-text-muted);
  font-weight: 600;
}

.lf-reconciliation-table tbody tr:last-child td {
  border-bottom: 0;
}

.lf-table-actions {
  text-align: right;
}

.lf-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.lf-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 var(--lf-space-2);
  border-radius: var(--lf-radius-sm);
  background: rgba(255, 255, 255, 0.06);
  color: var(--lf-text-primary);
  font-size: 0.75rem;
  font-weight: 600;
}

@media (max-width: 960px) {
  .lf-kpi-grid,
  .lf-reconciliation-breakdowns {
    grid-template-columns: 1fr;
  }
}
</style>
