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
            <AppButton v-if="canManage" variant="secondary" @click="isAdjustmentModalOpen = true">
              {{ t('marketplaceSettlement.actions.newAdjustment') }}
            </AppButton>
          </div>

          <div class="lf-settlement-table-wrap">
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
}

.lf-settlement-ledger h2 {
  margin: 0;
}

.lf-settlement-table-wrap {
  overflow-x: auto;
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
