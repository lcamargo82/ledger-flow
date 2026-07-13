<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppButton from '../components/common/AppButton.vue'
import AppEmptyState from '../components/common/AppEmptyState.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppLoading from '../components/common/AppLoading.vue'
import AppModal from '../components/common/AppModal.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import { useI18n } from '../composables/useI18n'
import {
  GatewayConnectionsService,
  type GatewayConnection,
} from '../services/gateway-connections.service'
import { useAuthStore } from '../stores/auth.store'
import { useMarketplaceSettlementStore } from '../stores/marketplace-settlement.store'
import type { MarketplaceFinancialAccount } from '../types/marketplace-settlement.types'
import { formatDateTime } from '../utils/date-format'
import { formatMoneyFromCents } from '../utils/money-format'

const { t, getLocale } = useI18n()
const authStore = useAuthStore()
const settlementStore = useMarketplaceSettlementStore()

const connections = ref<GatewayConnection[]>([])
const isCreateModalOpen = ref(false)
const isAdjustmentModalOpen = ref(false)
const isSyncModalOpen = ref(false)

const accountForm = reactive({
  gatewayConfigurationId: '',
  name: '',
  openingBalance: '0.00',
  reasonCode: 'initial_balance',
  notes: '',
})

const adjustmentForm = reactive({
  amount: '0.00',
  reasonCode: 'manual_correction',
  notes: '',
})

const syncForm = reactive({
  from: '',
  to: '',
  maxPages: 3,
})

const eligibleMercadoPagoConnections = computed(() =>
  connections.value.filter(
    (connection) =>
      connection.provider === 'MERCADO_PAGO' &&
      connection.financialReadiness?.canReadSettlements === true,
  ),
)

const connectionOptions = computed(() =>
  eligibleMercadoPagoConnections.value.map((connection) => ({
    value: connection.id,
    label: connection.displayName || `${connection.provider} ${connection.environment}`,
  })),
)

const canManage = computed(() => authStore.checkAllPermissions(['marketplace-settlement:manage']))

const hasAccounts = computed(() => settlementStore.accounts.length > 0)

onMounted(async () => {
  const [gatewayConnections] = await Promise.all([
    GatewayConnectionsService.listConnections(),
    settlementStore.fetchAccounts(),
  ])
  connections.value = gatewayConnections
  if (!accountForm.gatewayConfigurationId && connectionOptions.value[0]) {
    accountForm.gatewayConfigurationId = String(connectionOptions.value[0].value)
  }
})

const formatMinor = (value?: string | null, currency = 'BRL') => {
  if (!value) return formatMoneyFromCents(0, currency, getLocale())
  return formatMoneyFromCents(Number(value), currency, getLocale())
}

const toMinorUnits = (value: string) => Math.round(Number(value.replace(',', '.')) * 100)

const toDateTimeLocal = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const ensureDefaultSyncPeriod = () => {
  if (syncForm.from && syncForm.to) return
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 7)
  syncForm.from = toDateTimeLocal(start)
  syncForm.to = toDateTimeLocal(now)
}

const openSyncModal = () => {
  ensureDefaultSyncPeriod()
  isSyncModalOpen.value = true
}

const toIsoDateTime = (value: string) => new Date(value).toISOString()

const selectAccount = async (account: MarketplaceFinancialAccount) => {
  await settlementStore.fetchLedger(account.id)
}

const submitAccount = async () => {
  await settlementStore.createAccount({
    provider: 'MERCADO_PAGO',
    gatewayConfigurationId: accountForm.gatewayConfigurationId,
    name: accountForm.name,
    currency: 'BRL',
    openingBalanceMinor: toMinorUnits(accountForm.openingBalance),
    reasonCode: accountForm.reasonCode,
    notes: accountForm.notes || undefined,
  })
  isCreateModalOpen.value = false
  accountForm.name = ''
  accountForm.openingBalance = '0.00'
  accountForm.notes = ''
}

const submitAdjustment = async () => {
  if (!settlementStore.selectedAccountId) return
  await settlementStore.createAdjustment(settlementStore.selectedAccountId, {
    amountMinor: toMinorUnits(adjustmentForm.amount),
    reasonCode: adjustmentForm.reasonCode,
    notes: adjustmentForm.notes,
  })
  isAdjustmentModalOpen.value = false
  adjustmentForm.amount = '0.00'
  adjustmentForm.notes = ''
}

const submitSync = async () => {
  if (!settlementStore.selectedAccountId) return
  await settlementStore.syncFinancialEvents(settlementStore.selectedAccountId, {
    from: toIsoDateTime(syncForm.from),
    to: toIsoDateTime(syncForm.to),
    maxPages: Number(syncForm.maxPages) || 3,
  })
  isSyncModalOpen.value = false
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="t('marketplaceSettlement.title')"
      :description="t('marketplaceSettlement.description')"
    >
      <template #actions>
        <AppButton
          v-if="canManage"
          :disabled="connectionOptions.length === 0"
          @click="isCreateModalOpen = true"
        >
          {{ t('marketplaceSettlement.actions.newAccount') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppLoading v-if="settlementStore.isLoading" />

    <AppErrorState
      v-else-if="settlementStore.error"
      :title="t(settlementStore.error)"
      show-retry
      @retry="settlementStore.fetchAccounts"
    />

    <div v-else class="lf-marketplace-settlement">
      <section v-if="connectionOptions.length === 0" class="lf-settlement-warning">
        <span class="material-symbols-outlined">info</span>
        <div>
          <strong>{{ t('marketplaceSettlement.readiness.title') }}</strong>
          <p>{{ t('marketplaceSettlement.readiness.description') }}</p>
        </div>
      </section>

      <AppEmptyState
        v-if="!hasAccounts"
        :title="t('marketplaceSettlement.empty.title')"
        :description="t('marketplaceSettlement.empty.description')"
      />

      <template v-else>
        <div class="lf-settlement-grid">
          <button
            v-for="account in settlementStore.accounts"
            :key="account.id"
            class="lf-settlement-account-card"
            :class="{
              'lf-settlement-account-card--active':
                account.id === settlementStore.selectedAccountId,
            }"
            @click="selectAccount(account)"
          >
            <span>{{ account.name }}</span>
            <strong>{{ formatMinor(account.currentBalanceMinor, account.currency) }}</strong>
            <small>{{ account.provider }} · {{ account.environment }}</small>
          </button>
        </div>

        <section v-if="settlementStore.selectedAccount" class="lf-settlement-ledger">
          <div class="lf-settlement-ledger__header">
            <div>
              <h2>{{ settlementStore.selectedAccount.name }}</h2>
              <p>
                {{ t('marketplaceSettlement.account.openingBalance') }}:
                {{
                  formatMinor(
                    settlementStore.selectedAccount.openingBalanceMinor,
                    settlementStore.selectedAccount.currency,
                  )
                }}
              </p>
            </div>
            <div class="lf-settlement-actions">
              <AppButton v-if="canManage" variant="secondary" @click="isAdjustmentModalOpen = true">
                {{ t('marketplaceSettlement.actions.newAdjustment') }}
              </AppButton>
              <AppButton
                v-if="canManage"
                :loading="settlementStore.isSyncing"
                @click="openSyncModal"
              >
                {{ t('marketplaceSettlement.actions.sync') }}
              </AppButton>
            </div>
          </div>

          <div class="lf-settlement-totals">
            <article>
              <span>{{ t('marketplaceSettlement.totals.events') }}</span>
              <strong>{{ settlementStore.importedTotals?.eventCount ?? 0 }}</strong>
            </article>
            <article>
              <span>{{ t('marketplaceSettlement.totals.gross') }}</span>
              <strong>
                {{
                  formatMinor(
                    settlementStore.importedTotals?.grossAmountMinor,
                    settlementStore.importedTotals?.currency || 'BRL',
                  )
                }}
              </strong>
            </article>
            <article>
              <span>{{ t('marketplaceSettlement.totals.fees') }}</span>
              <strong>
                {{
                  formatMinor(
                    settlementStore.importedTotals?.feeAmountMinor,
                    settlementStore.importedTotals?.currency || 'BRL',
                  )
                }}
              </strong>
            </article>
            <article>
              <span>{{ t('marketplaceSettlement.totals.net') }}</span>
              <strong>
                {{
                  formatMinor(
                    settlementStore.importedTotals?.netAmountMinor,
                    settlementStore.importedTotals?.currency || 'BRL',
                  )
                }}
              </strong>
            </article>
          </div>

          <section v-if="settlementStore.lastSyncResult" class="lf-settlement-sync-result">
            {{
              t('marketplaceSettlement.sync.result', {
                received: settlementStore.lastSyncResult.received,
                created: settlementStore.lastSyncResult.created,
                duplicates: settlementStore.lastSyncResult.duplicates,
              })
            }}
          </section>

          <section v-if="settlementStore.dashboard" class="lf-settlement-dashboard">
            <div class="lf-settlement-section-heading">
              <h3>{{ t('marketplaceSettlement.sections.cashPosition') }}</h3>
              <p>{{ t('marketplaceSettlement.dashboard.note') }}</p>
            </div>
            <div class="lf-settlement-totals">
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.released') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.cashPosition.releasedAmountMinor,
                      settlementStore.dashboard.cashPosition.currency,
                    )
                  }}
                </strong>
              </article>
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.pending') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.cashPosition.pendingAmountMinor,
                      settlementStore.dashboard.cashPosition.currency,
                    )
                  }}
                </strong>
              </article>
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.blocked') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.cashPosition.blockedAmountMinor,
                      settlementStore.dashboard.cashPosition.currency,
                    )
                  }}
                </strong>
              </article>
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.refunded') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.cashPosition.refundedAmountMinor,
                      settlementStore.dashboard.cashPosition.currency,
                    )
                  }}
                </strong>
              </article>
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.payout') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.cashPosition.payoutAmountMinor,
                      settlementStore.dashboard.cashPosition.currency,
                    )
                  }}
                </strong>
              </article>
            </div>

            <div class="lf-settlement-section-heading">
              <h3>{{ t('marketplaceSettlement.sections.operationalPnl') }}</h3>
              <p>
                {{
                  t('marketplaceSettlement.dashboard.matchedOrders', {
                    count: settlementStore.dashboard.operationalPnl.matchedOrderCount,
                  })
                }}
              </p>
            </div>
            <div class="lf-settlement-totals">
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.netRevenue') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.operationalPnl.netRevenueMinor,
                      settlementStore.dashboard.operationalPnl.currency,
                    )
                  }}
                </strong>
              </article>
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.cogs') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.operationalPnl.cogsAmountMinor,
                      settlementStore.dashboard.operationalPnl.currency,
                    )
                  }}
                </strong>
              </article>
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.shipping') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.operationalPnl.shippingAmountMinor,
                      settlementStore.dashboard.operationalPnl.currency,
                    )
                  }}
                </strong>
              </article>
              <article>
                <span>{{ t('marketplaceSettlement.dashboard.margin') }}</span>
                <strong>
                  {{
                    formatMinor(
                      settlementStore.dashboard.operationalPnl.grossMarginMinor,
                      settlementStore.dashboard.operationalPnl.currency,
                    )
                  }}
                </strong>
              </article>
            </div>
          </section>

          <div class="lf-settlement-table-wrap">
            <h3>{{ t('marketplaceSettlement.sections.ledger') }}</h3>
            <table class="lf-settlement-table">
              <thead>
                <tr>
                  <th>{{ t('marketplaceSettlement.table.type') }}</th>
                  <th>{{ t('marketplaceSettlement.table.amount') }}</th>
                  <th>{{ t('marketplaceSettlement.table.balance') }}</th>
                  <th>{{ t('marketplaceSettlement.table.reason') }}</th>
                  <th>{{ t('marketplaceSettlement.table.occurredAt') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in settlementStore.ledgerEntries" :key="entry.id">
                  <td>{{ t(`marketplaceSettlement.ledgerType.${entry.type}`) }}</td>
                  <td>{{ formatMinor(entry.amountMinor, entry.currency) }}</td>
                  <td>{{ formatMinor(entry.balanceAfterMinor, entry.currency) }}</td>
                  <td>
                    <span>{{ entry.reasonCode }}</span>
                    <small v-if="entry.notes">{{ entry.notes }}</small>
                  </td>
                  <td>{{ formatDateTime(entry.occurredAt, getLocale()) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="lf-settlement-table-wrap">
            <h3>{{ t('marketplaceSettlement.sections.importedEvents') }}</h3>
            <table class="lf-settlement-table">
              <thead>
                <tr>
                  <th>{{ t('marketplaceSettlement.events.providerPaymentId') }}</th>
                  <th>{{ t('marketplaceSettlement.events.status') }}</th>
                  <th>{{ t('marketplaceSettlement.events.gross') }}</th>
                  <th>{{ t('marketplaceSettlement.events.fees') }}</th>
                  <th>{{ t('marketplaceSettlement.events.net') }}</th>
                  <th>{{ t('marketplaceSettlement.events.occurredAt') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="event in settlementStore.importedEvents" :key="event.id">
                  <td>
                    <span>{{ event.providerPaymentId || event.providerEventId }}</span>
                    <small v-if="event.externalReference">{{ event.externalReference }}</small>
                  </td>
                  <td>{{ event.providerStatus || event.eventType }}</td>
                  <td>{{ formatMinor(event.amountMinor, event.currency) }}</td>
                  <td>{{ formatMinor(event.feeAmountMinor, event.currency) }}</td>
                  <td>{{ formatMinor(event.netAmountMinor, event.currency) }}</td>
                  <td>
                    {{ event.occurredAt ? formatDateTime(event.occurredAt, getLocale()) : '-' }}
                  </td>
                </tr>
                <tr v-if="settlementStore.importedEvents.length === 0">
                  <td colspan="6">{{ t('marketplaceSettlement.events.empty') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>

    <AppModal
      v-model="isCreateModalOpen"
      :title="t('marketplaceSettlement.form.createTitle')"
      size="lg"
    >
      <form class="lf-settlement-form" @submit.prevent="submitAccount">
        <AppSelect
          v-model="accountForm.gatewayConfigurationId"
          :label="t('marketplaceSettlement.form.connection')"
          :options="connectionOptions"
          required
        />
        <AppInput
          v-model="accountForm.name"
          :label="t('marketplaceSettlement.form.name')"
          required
        />
        <AppInput
          v-model="accountForm.openingBalance"
          :label="t('marketplaceSettlement.form.openingBalance')"
          required
        />
        <AppInput
          v-model="accountForm.reasonCode"
          :label="t('marketplaceSettlement.form.reasonCode')"
          required
        />
        <AppInput v-model="accountForm.notes" :label="t('marketplaceSettlement.form.notes')" />
        <div class="lf-modal-footer-actions">
          <AppButton variant="secondary" @click="isCreateModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" :loading="settlementStore.isMutating">
            {{ t('marketplaceSettlement.actions.create') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal
      v-model="isAdjustmentModalOpen"
      :title="t('marketplaceSettlement.form.adjustmentTitle')"
      size="lg"
    >
      <form class="lf-settlement-form" @submit.prevent="submitAdjustment">
        <AppInput
          v-model="adjustmentForm.amount"
          :label="t('marketplaceSettlement.form.adjustmentAmount')"
          required
        />
        <AppInput
          v-model="adjustmentForm.reasonCode"
          :label="t('marketplaceSettlement.form.reasonCode')"
          required
        />
        <AppInput
          v-model="adjustmentForm.notes"
          :label="t('marketplaceSettlement.form.notes')"
          required
        />
        <div class="lf-modal-footer-actions">
          <AppButton variant="secondary" @click="isAdjustmentModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" :loading="settlementStore.isMutating">
            {{ t('marketplaceSettlement.actions.recordAdjustment') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal v-model="isSyncModalOpen" :title="t('marketplaceSettlement.sync.title')" size="lg">
      <form class="lf-settlement-form" @submit.prevent="submitSync">
        <p class="lf-settlement-help">{{ t('marketplaceSettlement.sync.description') }}</p>
        <AppInput
          v-model="syncForm.from"
          type="datetime-local"
          :label="t('marketplaceSettlement.sync.from')"
          required
        />
        <AppInput
          v-model="syncForm.to"
          type="datetime-local"
          :label="t('marketplaceSettlement.sync.to')"
          required
        />
        <AppInput
          v-model="syncForm.maxPages"
          type="number"
          min="1"
          max="10"
          :label="t('marketplaceSettlement.sync.maxPages')"
          required
        />
        <div class="lf-modal-footer-actions">
          <AppButton variant="secondary" @click="isSyncModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" :loading="settlementStore.isSyncing">
            {{ t('marketplaceSettlement.actions.sync') }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<style scoped>
.lf-marketplace-settlement {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

.lf-settlement-warning {
  display: flex;
  gap: var(--lf-space-3);
  padding: var(--lf-space-4);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  color: var(--lf-text-muted);
  background: var(--lf-bg-card);
}

.lf-settlement-warning strong {
  color: var(--lf-text-primary);
}

.lf-settlement-warning p {
  margin: var(--lf-space-1) 0 0;
}

.lf-settlement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--lf-space-4);
}

.lf-settlement-account-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--lf-space-2);
  padding: var(--lf-space-4);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  color: var(--lf-text-primary);
  background: var(--lf-bg-card);
  cursor: pointer;
  text-align: left;
}

.lf-settlement-account-card--active {
  border-color: var(--lf-color-primary);
  box-shadow: 0 0 0 1px var(--lf-color-primary);
}

.lf-settlement-account-card strong {
  font-size: 1.5rem;
}

.lf-settlement-account-card small,
.lf-settlement-ledger p,
.lf-settlement-table small {
  color: var(--lf-text-muted);
}

.lf-settlement-ledger {
  padding: var(--lf-space-4);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  background: var(--lf-bg-card);
}

.lf-settlement-ledger__header {
  display: flex;
  justify-content: space-between;
  gap: var(--lf-space-4);
  margin-bottom: var(--lf-space-4);
  align-items: flex-start;
}

.lf-settlement-actions {
  display: flex;
  gap: var(--lf-space-3);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.lf-settlement-ledger h2 {
  margin: 0;
}

.lf-settlement-table-wrap {
  overflow-x: auto;
  margin-top: var(--lf-space-4);
}

.lf-settlement-table-wrap h3,
.lf-settlement-section-heading h3 {
  margin: 0 0 var(--lf-space-3);
  font-size: 1rem;
}

.lf-settlement-dashboard {
  margin-top: var(--lf-space-4);
}

.lf-settlement-section-heading {
  margin: var(--lf-space-4) 0 var(--lf-space-3);
}

.lf-settlement-section-heading p {
  margin: 0;
  color: var(--lf-text-muted);
}

.lf-settlement-totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--lf-space-3);
}

.lf-settlement-totals article,
.lf-settlement-sync-result {
  padding: var(--lf-space-3);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  background: var(--lf-bg-elevated, var(--lf-bg-card));
}

.lf-settlement-totals span {
  display: block;
  color: var(--lf-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lf-settlement-totals strong {
  display: block;
  margin-top: var(--lf-space-1);
  font-size: 1.25rem;
}

.lf-settlement-sync-result,
.lf-settlement-help {
  color: var(--lf-text-muted);
}

.lf-settlement-table {
  width: 100%;
  border-collapse: collapse;
}

.lf-settlement-table th,
.lf-settlement-table td {
  padding: var(--lf-space-3);
  border-bottom: 1px solid var(--lf-border-primary);
  text-align: left;
}

.lf-settlement-table th {
  color: var(--lf-text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lf-settlement-table td small {
  display: block;
  margin-top: var(--lf-space-1);
}

.lf-settlement-form {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

.lf-modal-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--lf-space-3);
  margin-top: var(--lf-space-2);
}
</style>
