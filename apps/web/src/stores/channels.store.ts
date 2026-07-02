import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { channelsService } from '../services/channels.service'
import type {
  ChannelInboxMeta,
  ChannelIntegration,
  ChannelInventorySyncProcessSummary,
  ChannelInventorySyncState,
  ChannelInventorySyncStatus,
  ChannelListing,
  ChannelListingMatchStatus,
  ChannelListingsImportSummary,
  ChannelProvider,
  ChannelWebhookInboxEvent,
  ChannelWebhookStatus,
  CreateChannelIntegrationRequest,
  MapChannelListingRequest,
} from '../types/channels.types'

export const useChannelsStore = defineStore('channels', () => {
  const integrations = ref<ChannelIntegration[]>([])
  const inboxEvents = ref<ChannelWebhookInboxEvent[]>([])
  const listings = ref<ChannelListing[]>([])
  const inventorySyncStates = ref<ChannelInventorySyncState[]>([])
  const inboxMeta = ref<ChannelInboxMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const listingsMeta = ref<ChannelInboxMeta>({ page: 1, perPage: 10, total: 0, totalPages: 1 })
  const inventorySyncMeta = ref<ChannelInboxMeta>({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  })
  const lastImportSummary = ref<ChannelListingsImportSummary | null>(null)
  const lastSyncSummary = ref<ChannelInventorySyncProcessSummary | null>(null)
  const filters = ref<{
    page: number
    perPage: number
    provider?: ChannelProvider
    status?: ChannelWebhookStatus
  }>({ page: 1, perPage: 10 })
  const listingFilters = ref<{
    page: number
    perPage: number
    provider?: ChannelProvider
    status?: ChannelListingMatchStatus
  }>({ page: 1, perPage: 10, status: 'UNMATCHED' })
  const inventorySyncFilters = ref<{
    page: number
    perPage: number
    provider?: ChannelProvider
    status?: ChannelInventorySyncStatus
  }>({ page: 1, perPage: 10 })
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 403) return 'channels.errors.forbidden'
      if (err.response?.status === 400) return 'channels.errors.invalid'
    }
    return 'channels.errors.default'
  }

  const fetchChannels = async () => {
    isLoading.value = true
    error.value = null
    try {
      const [integrationsResponse, inboxResponse] = await Promise.all([
        channelsService.listIntegrations(),
        channelsService.listInbox(filters.value),
      ])
      integrations.value = integrationsResponse.data
      inboxEvents.value = inboxResponse.data
      inboxMeta.value = inboxResponse.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchListings = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await channelsService.listListings(listingFilters.value)
      listings.value = response.data
      listingsMeta.value = response.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchInventorySyncStatus = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await channelsService.listInventorySyncStatus(inventorySyncFilters.value)
      inventorySyncStates.value = response.data
      inventorySyncMeta.value = response.meta
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createIntegration = async (payload: CreateChannelIntegrationRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await channelsService.createIntegration(payload)
      await fetchChannels()
      return response.integration
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const setInboxStatus = (status?: ChannelWebhookStatus) => {
    filters.value.status = status
    filters.value.page = 1
    fetchChannels()
  }

  const setListingStatus = (status?: ChannelListingMatchStatus) => {
    listingFilters.value.status = status
    listingFilters.value.page = 1
    fetchListings()
  }

  const setInventorySyncStatus = (status?: ChannelInventorySyncStatus) => {
    inventorySyncFilters.value.status = status
    inventorySyncFilters.value.page = 1
    fetchInventorySyncStatus()
  }

  const importListings = async (integrationId: string) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await channelsService.importListings(integrationId)
      lastImportSummary.value = response.summary
      await fetchListings()
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const mapListing = async (listingId: string, payload: MapChannelListingRequest) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await channelsService.mapListing(listingId, payload)
      await fetchListings()
      return response.listing
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const processInventorySync = async () => {
    isMutating.value = true
    error.value = null
    try {
      const response = await channelsService.processInventorySync()
      lastSyncSummary.value = response
      await fetchInventorySyncStatus()
      return response
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  return {
    integrations,
    inboxEvents,
    listings,
    inventorySyncStates,
    inboxMeta,
    listingsMeta,
    inventorySyncMeta,
    lastImportSummary,
    lastSyncSummary,
    filters,
    listingFilters,
    inventorySyncFilters,
    isLoading,
    isMutating,
    error,
    fetchChannels,
    fetchListings,
    fetchInventorySyncStatus,
    createIntegration,
    setInboxStatus,
    setListingStatus,
    setInventorySyncStatus,
    importListings,
    mapListing,
    processInventorySync,
  }
})
