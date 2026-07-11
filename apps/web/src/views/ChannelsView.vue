<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useChannelsStore } from '../stores/channels.store'
import { useToastStore } from '../stores/toast.store'
import { useConfirmDialogStore } from '../stores/confirm-dialog.store'
import { inventoryService } from '../services/inventory.service'
import type { Warehouse } from '../types/inventory.types'
import type { ChannelIntegration } from '../types/channels.types'
import { formatDateTime } from '../utils/date-format'
import type {
  ChannelInventorySyncStatus,
  ChannelListing,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookStatus,
} from '../types/channels.types'
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
const channelsStore = useChannelsStore()
const toast = useToastStore()
const confirmDialog = useConfirmDialogStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<'integrations' | 'inbox' | 'listings' | 'sync'>('integrations')
const isCreateModalOpen = ref(false)
const isMapModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const selectedIntegration = ref<ChannelIntegration | null>(null)
const warehouses = ref<Warehouse[]>([])
const selectedListing = ref<ChannelListing | null>(null)

const integrationForm = reactive({
  provider: 'MOCK' as ChannelProvider,
  name: '',
  webhookSecret: '',
})

const channelProviderOptions = computed(() => [
  { value: 'MOCK', label: t('channels.provider.MOCK') },
  { value: 'MERCADO_LIVRE', label: t('channels.provider.MERCADO_LIVRE') },
])

const mappingForm = reactive({
  skuId: '',
  reason: '',
})

const settingsForm = reactive({
  defaultWarehouseId: '',
  syncEnabled: true,
  importListingsOnConnect: false,
})
const warehouseOptions = computed(() => [
  { value: '', label: t('channels.settings.noWarehouse') },
  ...warehouses.value.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
])

const integrationColumns = computed(() => [
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'name', label: t('channels.table.name') },
  { key: 'status', label: t('channels.table.status') },
  { key: 'health', label: t('channels.table.health') },
  { key: 'createdAt', label: t('channels.table.createdAt') },
  { key: 'actions', label: t('channels.table.actions') },
])

const inboxColumns = computed(() => [
  { key: 'receivedAt', label: t('channels.table.receivedAt') },
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'eventType', label: t('channels.table.eventType') },
  { key: 'providerEventId', label: t('channels.table.providerEventId') },
  { key: 'status', label: t('channels.table.status') },
  { key: 'summary', label: t('channels.table.summary') },
])

const listingColumns = computed(() => [
  { key: 'importedAt', label: t('channels.table.importedAt') },
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'title', label: t('channels.table.title') },
  { key: 'externalSku', label: t('channels.table.externalSku') },
  { key: 'matchStatus', label: t('channels.table.status') },
  { key: 'candidates', label: t('channels.table.candidates') },
  { key: 'actions', label: t('channels.table.actions') },
])

const syncColumns = computed(() => [
  { key: 'updatedAt', label: t('channels.table.updatedAt') },
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'externalListingId', label: t('channels.table.providerEventId') },
  { key: 'skuId', label: t('channels.table.skuId') },
  { key: 'quantity', label: t('channels.table.targetAvailable') },
  { key: 'status', label: t('channels.table.status') },
  { key: 'circuit', label: t('channels.table.circuit') },
  { key: 'nextAttemptAt', label: t('channels.table.nextAttemptAt') },
])

const statusOptions = computed(() => [
  { value: '', label: t('channels.filters.statusAll') },
  { value: 'RECEIVED', label: t('channels.webhookStatus.RECEIVED') },
  { value: 'DUPLICATE', label: t('channels.webhookStatus.DUPLICATE') },
  { value: 'INVALID', label: t('channels.webhookStatus.INVALID') },
  { value: 'DLQ', label: t('channels.webhookStatus.DLQ') },
])

const listingStatusOptions = computed(() => [
  { value: '', label: t('channels.filters.statusAll') },
  { value: 'UNMATCHED', label: t('channels.listingStatus.UNMATCHED') },
  { value: 'AMBIGUOUS', label: t('channels.listingStatus.AMBIGUOUS') },
  { value: 'MATCHED', label: t('channels.listingStatus.MATCHED') },
  { value: 'IGNORED', label: t('channels.listingStatus.IGNORED') },
])

const inventorySyncStatusOptions = computed(() => [
  { value: '', label: t('channels.filters.statusAll') },
  { value: 'PENDING', label: t('channels.syncStatus.PENDING') },
  { value: 'SYNCED', label: t('channels.syncStatus.SYNCED') },
  { value: 'RETRY_SCHEDULED', label: t('channels.syncStatus.RETRY_SCHEDULED') },
  { value: 'CIRCUIT_OPEN', label: t('channels.syncStatus.CIRCUIT_OPEN') },
  { value: 'FAILED', label: t('channels.syncStatus.FAILED') },
])

const refreshFromOtherTab = (event: StorageEvent) => {
  if (event.key === 'ledgerflow:channel-connected') channelsStore.fetchChannels()
}

onMounted(async () => {
  await channelsStore.fetchChannels()
  channelsStore.fetchListings({ setError: false }).catch(() => undefined)
  channelsStore.fetchInventorySyncStatus({ setError: false }).catch(() => undefined)
  inventoryService
    .listWarehouses({ isActive: true, perPage: 100 })
    .then((response) => {
      warehouses.value = response.data
    })
    .catch(() => undefined)
  if (route.query.mercadoLivre) {
    const connected = route.query.mercadoLivre === 'connected'
    if (connected) toast.success(t('channels.oauth.connectedSuccess'))
    else toast.error(t('channels.oauth.connectedFailed'))
    if (connected) localStorage.setItem('ledgerflow:channel-connected', String(Date.now()))
    await router.replace({ query: { ...route.query, mercadoLivre: undefined } })
  }
  window.addEventListener('storage', refreshFromOtherTab)
})

onBeforeUnmount(() => window.removeEventListener('storage', refreshFromOtherTab))

const createIntegration = async () => {
  if (integrationForm.provider === 'MERCADO_LIVRE') {
    await channelsStore.connectMercadoLivre()
    return
  }

  await channelsStore.createIntegration({
    provider: integrationForm.provider,
    name: integrationForm.name,
    webhookSecret: integrationForm.webhookSecret,
  })
  integrationForm.name = ''
  integrationForm.webhookSecret = ''
  isCreateModalOpen.value = false
}

const webhookStatusVariant = (status: ChannelWebhookStatus) => {
  if (status === 'RECEIVED') return 'success'
  if (status === 'INVALID' || status === 'DLQ') return 'danger'
  return 'warning'
}

const listingStatusVariant = (status: ChannelListingMatchStatus) => {
  if (status === 'MATCHED') return 'success'
  if (status === 'AMBIGUOUS') return 'warning'
  if (status === 'IGNORED') return 'default'
  return 'danger'
}

const syncStatusVariant = (status: ChannelInventorySyncStatus) => {
  if (status === 'SYNCED') return 'success'
  if (status === 'RETRY_SCHEDULED' || status === 'PENDING') return 'warning'
  return 'danger'
}

const canImportListings = computed(
  () =>
    authStore.checkAllPermissions(['channels:manage']) &&
    authStore.checkCapability('channels.import_listings'),
)

const canMapListings = computed(
  () =>
    authStore.checkAllPermissions(['channels:manage']) &&
    authStore.checkCapability('channels.mapping.manage'),
)

const canSyncInventory = computed(
  () =>
    authStore.checkAllPermissions(['channels:manage']) &&
    authStore.checkCapability('channels.sync_inventory'),
)

const importListings = async (integrationId: string) => {
  await channelsStore.importListings(integrationId)
  activeTab.value = 'listings'
}

const openSettings = (integration: ChannelIntegration) => {
  selectedIntegration.value = integration
  settingsForm.defaultWarehouseId = integration.defaultWarehouseId || ''
  settingsForm.syncEnabled = integration.settings.syncEnabled
  settingsForm.importListingsOnConnect = integration.settings.importListingsOnConnect
  isSettingsModalOpen.value = true
}

const saveSettings = async () => {
  if (!selectedIntegration.value) return
  await channelsStore.updateIntegrationSettings(selectedIntegration.value.id, {
    defaultWarehouseId: settingsForm.defaultWarehouseId || null,
    syncEnabled: settingsForm.syncEnabled,
    stockSyncMode: 'AVAILABLE',
    importListingsOnConnect: settingsForm.importListingsOnConnect,
  })
  toast.success(t('channels.settings.saved'))
  isSettingsModalOpen.value = false
}

const disconnectIntegration = (integration: ChannelIntegration) =>
  confirmDialog.open({
    title: t('channels.disconnect.title'),
    message: t('channels.disconnect.message'),
    confirmText: t('channels.actions.disconnect'),
    cancelText: t('common.cancel'),
    confirmVariant: 'danger',
    onConfirm: async () => channelsStore.disconnectMercadoLivre(integration.id),
    onCancel: null,
  })

const openMapModal = (listing: ChannelListing) => {
  selectedListing.value = listing
  mappingForm.skuId = listing.matchedSkuId || ''
  mappingForm.reason = ''
  isMapModalOpen.value = true
}

const mapListing = async () => {
  if (!selectedListing.value) return
  await channelsStore.mapListing(selectedListing.value.id, {
    skuId: mappingForm.skuId,
    reason: mappingForm.reason || undefined,
  })
  isMapModalOpen.value = false
  selectedListing.value = null
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader :title="t('channels.title')" :description="t('channels.description')">
      <template #actions>
        <AppButton
          v-if="authStore.checkAllPermissions(['channels:manage'])"
          variant="primary"
          @click="isCreateModalOpen = true"
        >
          {{ t('channels.actions.createIntegration') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="channelsStore.error"
      :title="t('channels.errors.title')"
      :description="t(channelsStore.error)"
      @retry="channelsStore.fetchChannels()"
    />

    <template v-else>
      <AppCard>
        <div class="flex flex-wrap gap-2">
          <AppButton
            :variant="activeTab === 'integrations' ? 'primary' : 'secondary'"
            @click="activeTab = 'integrations'"
          >
            {{ t('channels.tabs.integrations') }}
          </AppButton>
          <AppButton
            :variant="activeTab === 'inbox' ? 'primary' : 'secondary'"
            @click="activeTab = 'inbox'"
          >
            {{ t('channels.tabs.inbox') }}
          </AppButton>
          <AppButton
            :variant="activeTab === 'listings' ? 'primary' : 'secondary'"
            @click="activeTab = 'listings'"
          >
            {{ t('channels.tabs.listings') }}
          </AppButton>
          <AppButton
            :variant="activeTab === 'sync' ? 'primary' : 'secondary'"
            @click="activeTab = 'sync'"
          >
            {{ t('channels.tabs.sync') }}
          </AppButton>
        </div>
      </AppCard>

      <AppTable
        v-if="activeTab === 'integrations'"
        :columns="integrationColumns"
        :items="channelsStore.integrations"
        :is-loading="channelsStore.isLoading"
        :empty-title="t('channels.empty.integrationsTitle')"
        :empty-description="t('channels.empty.integrationsDescription')"
      >
        <template #provider="{ item }">
          <AppBadge variant="info">{{ t(`channels.provider.${item.provider}`) }}</AppBadge>
        </template>
        <template #status="{ item }">
          <AppBadge :variant="item.status === 'ACTIVE' ? 'success' : 'default'">
            {{ t(`channels.integrationStatus.${item.status}`) }}
          </AppBadge>
        </template>
        <template #health="{ item }">
          <AppBadge :variant="item.healthStatus === 'HEALTHY' ? 'success' : 'warning'">
            {{ t(`channels.health.${item.healthStatus}`) }}
          </AppBadge>
        </template>
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>
        <template #actions="{ item }">
          <div class="flex flex-wrap gap-1">
            <AppButton
              v-if="authStore.checkAllPermissions(['channels:manage'])"
              variant="secondary"
              size="small"
              icon-only
              :title="t('channels.actions.configure')"
              @click="openSettings(item)"
              ><template #icon
                ><span class="material-symbols-outlined text-[18px]">settings</span></template
              ></AppButton
            >
            <AppButton
              v-if="canImportListings && item.status === 'ACTIVE'"
              variant="secondary"
              size="small"
              icon-only
              :title="t('channels.actions.importListings')"
              :loading="channelsStore.isMutating"
              @click="importListings(item.id)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">cloud_download</span>
              </template>
            </AppButton>
            <AppButton
              v-if="item.status === 'ACTIVE'"
              variant="secondary"
              size="small"
              icon-only
              :title="t('channels.actions.suspend')"
              @click="channelsStore.suspendIntegration(item.id)"
            >
              <template #icon
                ><span class="material-symbols-outlined text-[18px]">pause</span></template
              >
            </AppButton>
            <AppButton
              v-if="item.status === 'SUSPENDED'"
              variant="secondary"
              size="small"
              icon-only
              :title="t('channels.actions.reactivate')"
              @click="channelsStore.reactivateIntegration(item.id)"
            >
              <template #icon
                ><span class="material-symbols-outlined text-[18px]">play_arrow</span></template
              >
            </AppButton>
            <AppButton
              v-if="item.requiresReauth"
              variant="secondary"
              size="small"
              icon-only
              :title="t('channels.actions.reconnect')"
              @click="channelsStore.connectMercadoLivre()"
            >
              <template #icon
                ><span class="material-symbols-outlined text-[18px]">sync</span></template
              >
            </AppButton>
            <AppButton
              v-if="item.provider === 'MERCADO_LIVRE' && item.status !== 'DISABLED'"
              variant="danger"
              size="small"
              icon-only
              :title="t('channels.actions.disconnect')"
              @click="disconnectIntegration(item)"
            >
              <template #icon
                ><span class="material-symbols-outlined text-[18px]">link_off</span></template
              >
            </AppButton>
          </div>
        </template>
      </AppTable>

      <div v-if="activeTab === 'inbox'" class="space-y-4">
        <AppCard>
          <AppSelect
            id="channel-inbox-status"
            :model-value="channelsStore.filters.status || ''"
            :label="t('channels.filters.statusLabel')"
            :options="statusOptions"
            @update:model-value="
              channelsStore.setInboxStatus(
                ($event || undefined) as ChannelWebhookStatus | undefined,
              )
            "
          />
        </AppCard>

        <AppTable
          :columns="inboxColumns"
          :items="channelsStore.inboxEvents"
          :is-loading="channelsStore.isLoading"
          :empty-title="t('channels.empty.inboxTitle')"
          :empty-description="t('channels.empty.inboxDescription')"
        >
          <template #receivedAt="{ item }">
            {{ formatDateTime(item.receivedAt, currentLocale) }}
          </template>
          <template #provider="{ item }">
            {{ t(`channels.provider.${item.provider}`) }}
          </template>
          <template #status="{ item }">
            <AppBadge :variant="webhookStatusVariant(item.status)">
              {{ t(`channels.webhookStatus.${item.status}`) }}
            </AppBadge>
          </template>
          <template #summary="{ item }">
            <span class="font-mono text-xs">{{ JSON.stringify(item.payloadSummary || {}) }}</span>
          </template>
        </AppTable>
      </div>

      <div v-if="activeTab === 'listings'" class="space-y-4">
        <AppCard>
          <div class="grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr] md:items-end">
            <AppSelect
              id="channel-listing-status"
              :model-value="channelsStore.listingFilters.status || ''"
              :label="t('channels.filters.statusLabel')"
              :options="listingStatusOptions"
              @update:model-value="
                channelsStore.setListingStatus(
                  ($event || undefined) as ChannelListingMatchStatus | undefined,
                )
              "
            />
            <div
              v-if="channelsStore.lastImportSummary"
              class="text-sm text-[var(--lf-text-secondary)]"
            >
              {{
                t('channels.importSummary', {
                  imported: channelsStore.lastImportSummary.imported,
                  matched: channelsStore.lastImportSummary.matched,
                  unmatched: channelsStore.lastImportSummary.unmatched,
                  ambiguous: channelsStore.lastImportSummary.ambiguous,
                })
              }}
            </div>
          </div>
        </AppCard>

        <AppTable
          :columns="listingColumns"
          :items="channelsStore.listings"
          :is-loading="channelsStore.isLoading"
          :empty-title="t('channels.empty.listingsTitle')"
          :empty-description="t('channels.empty.listingsDescription')"
        >
          <template #importedAt="{ item }">
            {{ formatDateTime(item.importedAt, currentLocale) }}
          </template>
          <template #provider="{ item }">
            {{ t(`channels.provider.${item.provider}`) }}
          </template>
          <template #externalSku="{ item }">
            <span class="font-mono text-xs">{{ item.externalSku || '-' }}</span>
          </template>
          <template #matchStatus="{ item }">
            <AppBadge :variant="listingStatusVariant(item.matchStatus)">
              {{ t(`channels.listingStatus.${item.matchStatus}`) }}
            </AppBadge>
          </template>
          <template #candidates="{ item }">
            <span class="font-mono text-xs">
              {{ (item.candidateSkuIds || []).join(', ') || '-' }}
            </span>
          </template>
          <template #actions="{ item }">
            <AppButton
              v-if="canMapListings && item.matchStatus !== 'IGNORED'"
              variant="secondary"
              size="small"
              icon-only
              :title="t('channels.actions.mapListing')"
              @click="openMapModal(item)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">link</span>
              </template>
            </AppButton>
          </template>
        </AppTable>
      </div>

      <div v-if="activeTab === 'sync'" class="space-y-4">
        <AppCard>
          <div class="grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr_auto] md:items-end">
            <AppSelect
              id="channel-sync-status"
              :model-value="channelsStore.inventorySyncFilters.status || ''"
              :label="t('channels.filters.statusLabel')"
              :options="inventorySyncStatusOptions"
              @update:model-value="
                channelsStore.setInventorySyncStatus(
                  ($event || undefined) as ChannelInventorySyncStatus | undefined,
                )
              "
            />
            <div
              v-if="channelsStore.lastSyncSummary"
              class="text-sm text-[var(--lf-text-secondary)]"
            >
              {{
                t('channels.syncSummary', {
                  processed: channelsStore.lastSyncSummary.processed,
                  synced: channelsStore.lastSyncSummary.synced,
                  retry: channelsStore.lastSyncSummary.retryScheduled,
                  circuit: channelsStore.lastSyncSummary.circuitOpened,
                })
              }}
            </div>
            <AppButton
              v-if="canSyncInventory"
              variant="secondary"
              :loading="channelsStore.isMutating"
              @click="channelsStore.processInventorySync()"
            >
              {{ t('channels.actions.processSync') }}
            </AppButton>
          </div>
        </AppCard>

        <AppTable
          :columns="syncColumns"
          :items="channelsStore.inventorySyncStates"
          :is-loading="channelsStore.isLoading"
          :empty-title="t('channels.empty.syncTitle')"
          :empty-description="t('channels.empty.syncDescription')"
        >
          <template #updatedAt="{ item }">
            {{ formatDateTime(item.updatedAt, currentLocale) }}
          </template>
          <template #provider="{ item }">
            {{ t(`channels.provider.${item.provider}`) }}
          </template>
          <template #skuId="{ item }">
            <span class="font-mono text-xs">{{ item.skuId }}</span>
          </template>
          <template #quantity="{ item }">
            {{ item.targetAvailableQuantity }}
          </template>
          <template #status="{ item }">
            <AppBadge :variant="syncStatusVariant(item.status)">
              {{ t(`channels.syncStatus.${item.status}`) }}
            </AppBadge>
          </template>
          <template #circuit="{ item }">
            <AppBadge :variant="item.circuitState === 'OPEN' ? 'danger' : 'default'">
              {{ t(`channels.circuitState.${item.circuitState}`) }}
            </AppBadge>
          </template>
          <template #nextAttemptAt="{ item }">
            {{ item.nextAttemptAt ? formatDateTime(item.nextAttemptAt, currentLocale) : '-' }}
          </template>
        </AppTable>
      </div>
    </template>

    <AppModal v-model="isCreateModalOpen" :title="t('channels.form.integrationTitle')" size="md">
      <form class="space-y-4" @submit.prevent="createIntegration">
        <AppSelect
          id="channel-provider"
          v-model="integrationForm.provider"
          :label="t('channels.form.providerLabel')"
          :options="channelProviderOptions"
        />
        <template v-if="integrationForm.provider === 'MOCK'">
          <AppInput
            id="channel-name"
            v-model="integrationForm.name"
            :label="t('channels.form.nameLabel')"
          />
          <AppInput
            id="channel-secret"
            v-model="integrationForm.webhookSecret"
            :label="t('channels.form.webhookSecretLabel')"
          />
        </template>
        <p v-else class="text-sm text-[var(--lf-text-secondary)]">
          {{ t('channels.form.mercadoLivreOAuthDescription') }}
        </p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isCreateModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="channelsStore.isMutating">
            {{
              integrationForm.provider === 'MERCADO_LIVRE'
                ? t('channels.actions.connectMercadoLivre')
                : t('channels.actions.createIntegration')
            }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal v-model="isSettingsModalOpen" :title="t('channels.settings.title')" size="md">
      <form class="space-y-4" @submit.prevent="saveSettings">
        <AppSelect
          id="channel-default-warehouse"
          v-model="settingsForm.defaultWarehouseId"
          :label="t('channels.settings.defaultWarehouse')"
          :options="warehouseOptions"
        />
        <label class="flex items-center gap-2 text-sm text-[var(--lf-text-secondary)]">
          <input v-model="settingsForm.syncEnabled" type="checkbox" />
          {{ t('channels.settings.syncEnabled') }}
        </label>
        <label class="flex items-center gap-2 text-sm text-[var(--lf-text-secondary)]">
          <input v-model="settingsForm.importListingsOnConnect" type="checkbox" />
          {{ t('channels.settings.importListingsOnConnect') }}
        </label>
        <p class="text-sm text-[var(--lf-text-secondary)]">
          {{ t('channels.settings.stockSyncModeAvailable') }}
        </p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isSettingsModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="channelsStore.isMutating">
            {{ t('channels.actions.save') }}
          </AppButton>
        </div>
      </form>
    </AppModal>

    <AppModal v-model="isMapModalOpen" :title="t('channels.form.mappingTitle')" size="md">
      <form class="space-y-4" @submit.prevent="mapListing">
        <p class="text-sm text-[var(--lf-text-secondary)]">
          {{ selectedListing?.title }}
        </p>
        <AppInput
          id="channel-mapping-sku"
          v-model="mappingForm.skuId"
          :label="t('channels.form.skuIdLabel')"
        />
        <AppInput
          id="channel-mapping-reason"
          v-model="mappingForm.reason"
          :label="t('channels.form.reasonLabel')"
        />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isMapModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="channelsStore.isMutating">
            {{ t('channels.actions.mapListing') }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>
