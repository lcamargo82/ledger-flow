<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '../components/common/AppButton.vue'
import AppEmptyState from '../components/common/AppEmptyState.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppLoading from '../components/common/AppLoading.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
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

onMounted(() => {
  reconciliationStore.fetchCases()
})

const openDecisionModal = (reconciliationCase: ReconciliationCase) => {
  selectedCase.value = reconciliationCase
  isDecisionModalOpen.value = true
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
      @retry="reconciliationStore.fetchCases"
    />

    <AppEmptyState
      v-else-if="!hasCases"
      :title="t('reconciliation.empty.title')"
      :description="t('reconciliation.empty.description')"
    />

    <div v-else class="lf-reconciliation-panel">
      <div class="lf-reconciliation-summary">
        <span>{{ t('reconciliation.summary.total') }}</span>
        <strong>{{ reconciliationStore.meta.total }}</strong>
      </div>

      <div class="lf-reconciliation-table-wrap">
        <table class="lf-reconciliation-table">
          <thead>
            <tr>
              <th>{{ t('reconciliation.table.case') }}</th>
              <th>{{ t('reconciliation.table.status') }}</th>
              <th>{{ t('reconciliation.table.provider') }}</th>
              <th>{{ t('reconciliation.table.received') }}</th>
              <th>{{ t('reconciliation.table.difference') }}</th>
              <th>{{ t('reconciliation.table.reference') }}</th>
              <th>{{ t('reconciliation.table.createdAt') }}</th>
              <th class="lf-table-actions">{{ t('reconciliation.table.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reconciliationStore.cases" :key="item.id">
              <td class="lf-mono">{{ item.id }}</td>
              <td>
                <span class="lf-status-pill">{{ item.status }}</span>
              </td>
              <td>{{ item.provider }}</td>
              <td>{{ formatMinor(item.receivedAmountMinor, item.currency) }}</td>
              <td>{{ formatMinor(item.differenceAmountMinor, item.currency) }}</td>
              <td>{{ item.settlementEvent.externalReference ?? '-' }}</td>
              <td>{{ formatDateTime(item.createdAt, getLocale()) }}</td>
              <td class="lf-table-actions">
                <AppButton
                  size="small"
                  variant="secondary"
                  data-testid="open-decision-modal"
                  @click="openDecisionModal(item)"
                >
                  {{ t('reconciliation.actions.review') }}
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ReconciliationDecisionModal
      v-model="isDecisionModalOpen"
      :reconciliation-case="selectedCase"
      :loading="reconciliationStore.isMutating"
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
</style>
