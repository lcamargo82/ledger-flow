<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useChannelsStore } from '../stores/channels.store'
import { formatDateTime } from '../utils/date-format'
import type {
  ChannelListing,
  ChannelListingMatchStatus,
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

const activeTab = ref<'integrations' | 'inbox' | 'listings'>('integrations')
const isCreateModalOpen = ref(false)
const isMapModalOpen = ref(false)
const selectedListing = ref<ChannelListing | null>(null)

const integrationForm = reactive({
  provider: 'MOCK' as const,
  name: '',
  webhookSecret: '',
})

const mappingForm = reactive({
  skuId: '',
  reason: '',
})

const integrationColumns = computed(() => [
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'name', label: t('channels.table.name') },
  { key: 'status', label: t('channels.table.status') },
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

onMounted(() => {
  channelsStore.fetchChannels()
  channelsStore.fetchListings()
})

const createIntegration = async () => {
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

const importListings = async (integrationId: string) => {
  await channelsStore.importListings(integrationId)
  activeTab.value = 'listings'
}

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
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>
        <template #actions="{ item }">
          <AppButton
            v-if="canImportListings && item.provider === 'MOCK' && item.status === 'ACTIVE'"
            variant="secondary"
            size="small"
            :loading="channelsStore.isMutating"
            @click="importListings(item.id)"
          >
            {{ t('channels.actions.importListings') }}
          </AppButton>
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
              @click="openMapModal(item)"
            >
              {{ t('channels.actions.mapListing') }}
            </AppButton>
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
          :options="[{ value: 'MOCK', label: t('channels.provider.MOCK') }]"
        />
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
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isCreateModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="channelsStore.isMutating">
            {{ t('channels.actions.createIntegration') }}
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
