<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useFinancialIntelligenceStore } from '../stores/financial-intelligence.store'
import { formatDateTime } from '../utils/date-format'
import { formatMoney } from '../utils/money-format'
import AppBadge from '../components/common/AppBadge.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppMetricCard from '../components/common/AppMetricCard.vue'
import AppMetricGrid from '../components/common/AppMetricGrid.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'

const { t, currentLocale } = useI18n()
const financialStore = useFinancialIntelligenceStore()

const factColumns = computed(() => [
  { key: 'calculatedAt', label: t('financialIntelligence.table.calculatedAt') },
  { key: 'orderNumber', label: t('financialIntelligence.table.orderNumber') },
  { key: 'channelProvider', label: t('financialIntelligence.table.channel') },
  { key: 'revenueAmount', label: t('financialIntelligence.table.revenue') },
  { key: 'cogsAmount', label: t('financialIntelligence.table.cogs') },
  { key: 'grossMarginAmount', label: t('financialIntelligence.table.margin') },
])

const channelOptions = computed(() => [
  { value: '', label: t('financialIntelligence.filters.allChannels') },
  { value: 'MOCK', label: t('channels.provider.MOCK') },
  { value: 'MERCADO_LIVRE', label: t('channels.provider.MERCADO_LIVRE') },
])

const formatDashboardMoney = (amount?: string) =>
  formatMoney(amount ?? '0', 'BRL', currentLocale.value)

onMounted(() => {
  financialStore.fetchAnalytics()
})
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="t('financialIntelligence.title')"
      :description="t('financialIntelligence.description')"
    />

    <AppErrorState
      v-if="financialStore.error"
      :title="t('financialIntelligence.errors.title')"
      :description="t(financialStore.error)"
      @retry="financialStore.fetchAnalytics()"
    />

    <template v-else>
      <AppMetricGrid :accessible-label="t('financialIntelligence.cards.title')">
        <AppMetricCard
          :label="t('financialIntelligence.cards.orders')"
          :value="financialStore.dashboard?.orderCount ?? 0"
        />
        <AppMetricCard
          :label="t('financialIntelligence.cards.revenue')"
          :value="formatDashboardMoney(financialStore.dashboard?.revenueAmount)"
        />
        <AppMetricCard
          :label="t('financialIntelligence.cards.cogs')"
          :value="formatDashboardMoney(financialStore.dashboard?.cogsAmount)"
        />
        <AppMetricCard
          :label="t('financialIntelligence.cards.margin')"
          :value="formatDashboardMoney(financialStore.dashboard?.grossMarginAmount)"
        />
      </AppMetricGrid>

      <AppCard>
        <div class="grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr] md:items-end">
          <AppSelect
            id="financial-channel"
            :model-value="financialStore.filters.channelProvider || ''"
            :label="t('financialIntelligence.filters.channel')"
            :options="channelOptions"
            @update:model-value="
              financialStore.setFilters({ channelProvider: ($event || undefined) as never })
            "
          />
          <p class="text-sm text-[var(--lf-text-secondary)]">
            {{ t('financialIntelligence.reconciliationNote') }}
          </p>
        </div>
      </AppCard>

      <AppTable
        :columns="factColumns"
        :items="financialStore.facts"
        :is-loading="financialStore.isLoading"
        :empty-title="t('financialIntelligence.empty.title')"
        :empty-description="t('financialIntelligence.empty.description')"
      >
        <template #calculatedAt="{ item }">
          {{ formatDateTime(item.calculatedAt, currentLocale) }}
        </template>
        <template #channelProvider="{ item }">
          <AppBadge variant="info">
            {{
              item.channelProvider
                ? t(`channels.provider.${item.channelProvider}`)
                : t('financialIntelligence.internalChannel')
            }}
          </AppBadge>
        </template>
      </AppTable>
    </template>
  </div>
</template>
