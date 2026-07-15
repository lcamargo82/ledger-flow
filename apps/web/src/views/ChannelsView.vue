<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useChannelsStore } from '../stores/channels.store'
import { useToastStore } from '../stores/toast.store'
import { useConfirmDialogStore } from '../stores/confirm-dialog.store'
import { inventoryService } from '../services/inventory.service'
import { channelsService } from '../services/channels.service'
import type { Warehouse } from '../types/inventory.types'
import type { ChannelIntegration, ChannelSkuOption } from '../types/channels.types'
import { formatDateTime } from '../utils/date-format'
import type {
  ChannelInventorySyncStatus,
  ChannelListing,
  ChannelListingMatchStatus,
  ChannelProvider,
  ChannelWebhookInboxEvent,
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
const isImportModalOpen = ref(false)
const selectedIntegration = ref<ChannelIntegration | null>(null)
const selectedImportIntegration = ref<ChannelIntegration | null>(null)
const warehouses = ref<Warehouse[]>([])
const selectedListing = ref<ChannelListing | null>(null)
const listingSearch = ref(channelsStore.listingFilters.search || '')
const mappingSearch = ref('')
const mappingSkuOptions = ref<ChannelSkuOption[]>([])
const mappingError = ref('')
const mappingSearchFeedback = ref('')
const mappingSearchFailed = ref(false)
const isLoadingSkuOptions = ref(false)
let mappingSearchTimer: ReturnType<typeof setTimeout> | null = null
let listingSearchTimer: ReturnType<typeof setTimeout> | null = null
let mappingSearchRequestId = 0

const integrationForm = reactive({
  provider: 'MOCK' as ChannelProvider,
  name: '',
  webhookSecret: '',
})

const importForm = reactive({ externalUserProductId: '' })

const channelProviderOptions = computed(() => [
  { value: 'MOCK', label: t('channels.provider.MOCK') },
  { value: 'MERCADO_LIVRE', label: t('channels.provider.MERCADO_LIVRE') },
])

const mappingForm = reactive({
  skuId: '',
  reason: '',
})

const readableSkuOptions = computed(() =>
  mappingSkuOptions.value.map((sku) => ({
    value: sku.id,
    label: `${sku.product.name} · ${sku.skuDisplay}`,
  })),
)

const settingsForm = reactive({
  defaultWarehouseId: '',
  syncEnabled: true,
  importListingsOnConnect: false,
  mercadoLivreWarehouseStoreId: '',
  mercadoLivreWarehouseNetworkNodeId: '',
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
  { key: 'failureReason', label: t('channels.table.failureReason') },
  { key: 'actions', label: t('channels.table.actions') },
])

const listingColumns = computed(() => [
  { key: 'importedAt', label: t('channels.table.importedAt') },
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'title', label: t('channels.table.title') },
  { key: 'externalIds', label: t('channels.table.externalIds') },
  { key: 'externalSku', label: t('channels.table.externalSku') },
  { key: 'matchStatus', label: t('channels.table.status') },
  { key: 'candidates', label: t('channels.table.candidates') },
  { key: 'actions', label: t('channels.table.actions') },
])

const syncColumns = computed(() => [
  { key: 'updatedAt', label: t('channels.table.updatedAt') },
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'externalListingId', label: t('channels.table.providerEventId') },
  { key: 'sku', label: t('channels.table.skuId') },
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

onBeforeUnmount(() => {
  window.removeEventListener('storage', refreshFromOtherTab)
  if (mappingSearchTimer) clearTimeout(mappingSearchTimer)
  if (listingSearchTimer) clearTimeout(listingSearchTimer)
})

const scheduleListingSearch = () => {
  if (listingSearchTimer) clearTimeout(listingSearchTimer)
  listingSearchTimer = setTimeout(() => {
    channelsStore.setListingSearch(listingSearch.value.trim() || undefined)
  }, 400)
}

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

const canReplayWebhooks = computed(() => authStore.checkAllPermissions(['channels:manage']))

const canReplayWebhook = (event: ChannelWebhookInboxEvent) =>
  event.status === 'RECEIVED' && !event.processedAt && Boolean(event.failureReason)

const replayWebhook = (event: ChannelWebhookInboxEvent) =>
  confirmDialog.open({
    title: t('channels.replay.singleTitle'),
    message: t('channels.replay.singleMessage'),
    confirmText: t('channels.actions.replay'),
    cancelText: t('common.cancel'),
    confirmVariant: 'primary',
    onConfirm: async () => {
      await channelsStore.replayWebhookInbox(event.id)
      toast.success(t('channels.replay.singleSuccess'))
    },
    onCancel: null,
  })

const replayFailedWebhooks = () =>
  confirmDialog.open({
    title: t('channels.replay.bulkTitle'),
    message: t('channels.replay.bulkMessage'),
    confirmText: t('channels.actions.replayFailed'),
    cancelText: t('common.cancel'),
    confirmVariant: 'primary',
    onConfirm: async () => {
      const result = await channelsStore.replayFailedWebhooks(50)
      toast.success(t('channels.replay.bulkSuccess', { count: result.replayed }))
    },
    onCancel: null,
  })

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

const openImportListings = (integration: ChannelIntegration) => {
  selectedImportIntegration.value = integration
  importForm.externalUserProductId = ''
  isImportModalOpen.value = true
}

const importListings = async () => {
  if (!selectedImportIntegration.value) return
  try {
    await channelsStore.importListings(selectedImportIntegration.value.id, {
      ...(importForm.externalUserProductId.trim() && {
        externalUserProductId: importForm.externalUserProductId.trim().toUpperCase(),
      }),
    })
    activeTab.value = 'listings'
    isImportModalOpen.value = false
  } catch {
    toast.error(t('channels.errors.importFailed'))
  }
}

const openSettings = (integration: ChannelIntegration) => {
  selectedIntegration.value = integration
  settingsForm.defaultWarehouseId = integration.defaultWarehouseId || ''
  settingsForm.syncEnabled = integration.settings.syncEnabled
  settingsForm.importListingsOnConnect = integration.settings.importListingsOnConnect
  settingsForm.mercadoLivreWarehouseStoreId =
    integration.settings.mercadoLivreWarehouseStoreId || ''
  settingsForm.mercadoLivreWarehouseNetworkNodeId =
    integration.settings.mercadoLivreWarehouseNetworkNodeId || ''
  isSettingsModalOpen.value = true
}

const saveSettings = async () => {
  if (!selectedIntegration.value) return
  await channelsStore.updateIntegrationSettings(selectedIntegration.value.id, {
    defaultWarehouseId: settingsForm.defaultWarehouseId || null,
    syncEnabled: settingsForm.syncEnabled,
    stockSyncMode: 'AVAILABLE',
    importListingsOnConnect: settingsForm.importListingsOnConnect,
    mercadoLivreWarehouseStoreId: settingsForm.mercadoLivreWarehouseStoreId || null,
    mercadoLivreWarehouseNetworkNodeId: settingsForm.mercadoLivreWarehouseNetworkNodeId || null,
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

const loadMappingSkuOptions = async (search = '') => {
  const requestId = ++mappingSearchRequestId
  isLoadingSkuOptions.value = true
  mappingSearchFeedback.value = ''
  mappingSearchFailed.value = false
  try {
    const options = await channelsService.listSkuOptions({ search, limit: 50 })
    if (requestId !== mappingSearchRequestId) return

    mappingSkuOptions.value = options
    const normalizedSearch = search.trim().toUpperCase()
    if (normalizedSearch) {
      const exactMatch = options.find(
        (option) =>
          option.skuCanonical.toUpperCase() === normalizedSearch ||
          option.skuDisplay.toUpperCase() === normalizedSearch,
      )
      mappingForm.skuId = exactMatch?.id || ''
      if (!options.length) {
        mappingSearchFeedback.value = t('channels.errors.skuNotFound', { search: search.trim() })
      }
    }
  } catch {
    if (requestId !== mappingSearchRequestId) return
    mappingSkuOptions.value = []
    mappingForm.skuId = ''
    mappingSearchFeedback.value = t('channels.errors.skuOptionsUnavailable')
    mappingSearchFailed.value = true
  } finally {
    if (requestId === mappingSearchRequestId) isLoadingSkuOptions.value = false
  }
}

watch(mappingSearch, (search) => {
  if (!isMapModalOpen.value) return
  if (mappingSearchTimer) clearTimeout(mappingSearchTimer)
  mappingError.value = ''
  mappingSearchTimer = setTimeout(() => loadMappingSkuOptions(search.trim()), 250)
})

const openMapModal = (listing: ChannelListing) => {
  selectedListing.value = listing
  mappingForm.skuId = listing.matchedSkuId || ''
  mappingForm.reason = ''
  mappingSearch.value = ''
  mappingError.value = ''
  mappingSearchFeedback.value = ''
  mappingSearchFailed.value = false
  mappingSkuOptions.value = listing.candidateSkus || []
  isMapModalOpen.value = true
  void loadMappingSkuOptions()
}

const mapListing = async () => {
  if (!selectedListing.value) return
  if (!mappingForm.skuId) {
    mappingError.value = t('channels.errors.skuRequired')
    return
  }
  mappingError.value = ''
  try {
    await channelsStore.mapListing(selectedListing.value.id, {
      skuId: mappingForm.skuId,
      reason: mappingForm.reason || undefined,
    })
    toast.success(t('channels.mapping.success'))
    isMapModalOpen.value = false
    selectedListing.value = null
  } catch {
    mappingError.value = t('channels.errors.mappingFailed')
  }
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
              @click="openImportListings(item)"
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
          <div class="flex flex-wrap items-end justify-between gap-3">
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
            <AppButton
              v-if="canReplayWebhooks"
              variant="secondary"
              :loading="channelsStore.isMutating"
              @click="replayFailedWebhooks"
            >
              {{ t('channels.actions.replayFailed') }}
            </AppButton>
          </div>
        </AppCard>

        <AppTable
          :columns="inboxColumns"
          :items="channelsStore.inboxEvents"
          :is-loading="channelsStore.isLoading"
          :empty-title="t('channels.empty.inboxTitle')"
          :empty-description="t('channels.empty.inboxDescription')"
          :pagination="channelsStore.inboxMeta"
          @update:page="channelsStore.setInboxPage"
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
          <template #failureReason="{ item }">
            <span class="text-xs text-[var(--lf-text-secondary)]">
              {{ item.failureReason || '-' }}
            </span>
          </template>
          <template #actions="{ item }">
            <AppButton
              v-if="canReplayWebhooks && canReplayWebhook(item)"
              variant="secondary"
              size="small"
              icon-only
              :title="t('channels.actions.replay')"
              :loading="channelsStore.isMutating"
              @click="replayWebhook(item)"
            >
              <template #icon>
                <span class="material-symbols-outlined text-[18px]">replay</span>
              </template>
            </AppButton>
          </template>
        </AppTable>
      </div>

      <div v-if="activeTab === 'listings'" class="space-y-4">
        <AppCard>
          <div class="lf-filter-container">
            <div class="lf-filter-item lf-filter-item--large">
              <AppInput
                id="channel-listing-search"
                v-model="listingSearch"
                :label="t('channels.filters.listingSearchLabel')"
                :placeholder="t('channels.filters.listingSearchPlaceholder')"
                @input="scheduleListingSearch"
              />
            </div>
            <div class="lf-filter-item">
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
            </div>
            <div
              v-if="channelsStore.lastImportSummary"
              class="self-end pb-3 text-sm text-[var(--lf-text-secondary)]"
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
          :pagination="channelsStore.listingsMeta"
          @update:page="channelsStore.setListingPage"
        >
          <template #importedAt="{ item }">
            {{ formatDateTime(item.importedAt, currentLocale) }}
          </template>
          <template #provider="{ item }">
            {{ t(`channels.provider.${item.provider}`) }}
          </template>
          <template #externalIds="{ item }">
            <div class="space-y-1 font-mono text-xs">
              <div>{{ item.externalListingId }}</div>
              <div v-if="item.externalUserProductId" class="text-[var(--lf-text-secondary)]">
                {{ item.externalUserProductId }}
              </div>
            </div>
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
            <div v-if="item.candidateSkus?.length" class="space-y-1 text-xs">
              <div v-for="candidate in item.candidateSkus" :key="candidate.id">
                {{ candidate.product.name }} ·
                <span class="font-mono">{{ candidate.skuDisplay }}</span>
              </div>
            </div>
            <span v-else>-</span>
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
          :pagination="channelsStore.inventorySyncMeta"
          @update:page="channelsStore.setInventorySyncPage"
        >
          <template #updatedAt="{ item }">
            {{ formatDateTime(item.updatedAt, currentLocale) }}
          </template>
          <template #provider="{ item }">
            {{ t(`channels.provider.${item.provider}`) }}
          </template>
          <template #sku="{ item }">
            <div v-if="item.sku" class="space-y-1">
              <div class="text-sm text-[var(--lf-text-primary)]">{{ item.sku.product.name }}</div>
              <div class="font-mono text-xs text-[var(--lf-text-secondary)]">
                {{ item.sku.skuDisplay }}
              </div>
            </div>
            <span v-else class="text-[var(--lf-text-secondary)]">-</span>
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

    <AppModal v-model="isImportModalOpen" :title="t('channels.import.title')" size="md">
      <form class="space-y-4" @submit.prevent="importListings">
        <AppInput
          id="channel-import-user-product-id"
          v-model="importForm.externalUserProductId"
          :label="t('channels.import.userProductId')"
          :placeholder="t('channels.import.userProductIdPlaceholder')"
        />
        <p class="text-sm text-[var(--lf-text-secondary)]">
          {{ t('channels.import.userProductIdHelp') }}
        </p>
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isImportModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="channelsStore.isMutating">
            {{ t('channels.actions.importListings') }}
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
        <template v-if="selectedIntegration?.provider === 'MERCADO_LIVRE'">
          <AppInput
            id="channel-mercado-livre-store-id"
            v-model="settingsForm.mercadoLivreWarehouseStoreId"
            :label="t('channels.settings.mercadoLivreWarehouseStoreId')"
          />
          <AppInput
            id="channel-mercado-livre-network-node-id"
            v-model="settingsForm.mercadoLivreWarehouseNetworkNodeId"
            :label="t('channels.settings.mercadoLivreWarehouseNetworkNodeId')"
          />
          <p class="text-sm text-[var(--lf-text-secondary)]">
            {{ t('channels.settings.mercadoLivreWarehouseHelp') }}
          </p>
        </template>
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
      <form class="space-y-4" novalidate @submit.prevent="mapListing">
        <p class="text-sm text-[var(--lf-text-secondary)]">
          {{ selectedListing?.title }}
        </p>
        <p class="font-mono text-xs text-[var(--lf-text-secondary)]">
          {{ selectedListing?.externalListingId }}
          <template v-if="selectedListing?.externalUserProductId">
            · {{ selectedListing.externalUserProductId }}
          </template>
        </p>
        <AppInput
          id="channel-mapping-sku-search"
          v-model="mappingSearch"
          :label="t('channels.form.skuSearchLabel')"
          :placeholder="t('channels.form.skuSearchPlaceholder')"
          autocomplete="off"
        />
        <p
          v-if="mappingSearchFeedback"
          class="text-sm"
          :class="
            mappingSearchFailed ? 'text-[var(--lf-danger)]' : 'text-[var(--lf-text-secondary)]'
          "
          role="status"
        >
          {{ mappingSearchFeedback }}
        </p>
        <AppSelect
          id="channel-mapping-sku"
          v-model="mappingForm.skuId"
          :label="t('channels.form.productSkuLabel')"
          :placeholder="
            isLoadingSkuOptions
              ? t('channels.form.loadingSkuOptions')
              : t('channels.form.selectSkuPlaceholder')
          "
          :options="readableSkuOptions"
          :disabled="isLoadingSkuOptions"
          :error="mappingError"
          required
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
