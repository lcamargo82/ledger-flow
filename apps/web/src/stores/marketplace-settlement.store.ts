import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { marketplaceSettlementService } from '../services/marketplace-settlement.service'
import type {
  CashLedgerEntry,
  CreateCashPositionAdjustmentPayload,
  CreateMarketplaceFinancialAccountPayload,
  MarketplaceFinancialAccount,
  MarketplaceSettlementDashboard,
  MarketplaceSettlementEvent,
  MarketplaceSettlementImportedTotals,
  MarketplaceSettlementSyncResult,
  SyncMarketplaceFinancialEventsPayload,
} from '../types/marketplace-settlement.types'

export const useMarketplaceSettlementStore = defineStore('marketplace-settlement', () => {
  const accounts = ref<MarketplaceFinancialAccount[]>([])
  const ledgerEntries = ref<CashLedgerEntry[]>([])
  const importedEvents = ref<MarketplaceSettlementEvent[]>([])
  const importedTotals = ref<MarketplaceSettlementImportedTotals | null>(null)
  const dashboard = ref<MarketplaceSettlementDashboard | null>(null)
  const lastSyncResult = ref<MarketplaceSettlementSyncResult | null>(null)
  const selectedAccountId = ref<string | null>(null)
  const ledgerMeta = ref({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const eventsMeta = ref({ page: 1, perPage: 20, total: 0, totalPages: 1 })
  const isLoading = ref(false)
  const isMutating = ref(false)
  const isSyncing = ref(false)
  const error = ref<string | null>(null)

  const selectedAccount = computed(
    () => accounts.value.find((account) => account.id === selectedAccountId.value) ?? null,
  )

  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 400) return 'marketplaceSettlement.errors.invalid'
      if (err.response?.status === 403) return 'marketplaceSettlement.errors.forbidden'
      if (err.response?.status === 404) return 'marketplaceSettlement.errors.notFound'
      if (err.response?.status === 409) return 'marketplaceSettlement.errors.duplicate'
    }
    return 'marketplaceSettlement.errors.default'
  }

  const fetchAccounts = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await marketplaceSettlementService.listFinancialAccounts()
      accounts.value = response.data
      const firstAccount = response.data[0]
      if (!selectedAccountId.value && firstAccount) {
        selectedAccountId.value = firstAccount.id
      }
      if (selectedAccountId.value) {
        await fetchLedger(selectedAccountId.value)
      }
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchLedger = async (accountId: string) => {
    selectedAccountId.value = accountId
    const [ledgerResponse, eventsResponse, totalsResponse, dashboardResponse] = await Promise.all([
      marketplaceSettlementService.listLedger(accountId, {
        page: ledgerMeta.value.page,
        perPage: ledgerMeta.value.perPage,
      }),
      marketplaceSettlementService.listEvents(accountId, {
        page: eventsMeta.value.page,
        perPage: eventsMeta.value.perPage,
      }),
      marketplaceSettlementService.getTotals(accountId),
      marketplaceSettlementService.getDashboard(accountId),
    ])
    const response = ledgerResponse
    ledgerEntries.value = response.data
    ledgerMeta.value = response.meta
    importedEvents.value = eventsResponse.data
    eventsMeta.value = eventsResponse.meta
    importedTotals.value = totalsResponse
    dashboard.value = dashboardResponse
  }

  const setLedgerPage = async (page: number) => {
    if (!selectedAccountId.value) return
    const response = await marketplaceSettlementService.listLedger(selectedAccountId.value, {
      page,
      perPage: ledgerMeta.value.perPage,
    })
    ledgerEntries.value = response.data
    ledgerMeta.value = response.meta
  }

  const setEventsPage = async (page: number) => {
    if (!selectedAccountId.value) return
    const response = await marketplaceSettlementService.listEvents(selectedAccountId.value, {
      page,
      perPage: eventsMeta.value.perPage,
    })
    importedEvents.value = response.data
    eventsMeta.value = response.meta
  }

  const createAccount = async (payload: CreateMarketplaceFinancialAccountPayload) => {
    isMutating.value = true
    error.value = null
    try {
      const response = await marketplaceSettlementService.createFinancialAccount(payload)
      selectedAccountId.value = response.account.id
      await fetchAccounts()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const createAdjustment = async (
    accountId: string,
    payload: CreateCashPositionAdjustmentPayload,
  ) => {
    isMutating.value = true
    error.value = null
    try {
      await marketplaceSettlementService.createAdjustment(accountId, payload)
      await fetchAccounts()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isMutating.value = false
    }
  }

  const syncFinancialEvents = async (
    accountId: string,
    payload: SyncMarketplaceFinancialEventsPayload,
  ) => {
    isSyncing.value = true
    error.value = null
    try {
      lastSyncResult.value = await marketplaceSettlementService.syncFinancialEvents(
        accountId,
        payload,
      )
      await fetchLedger(accountId)
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      isSyncing.value = false
    }
  }

  return {
    accounts,
    ledgerEntries,
    importedEvents,
    importedTotals,
    dashboard,
    lastSyncResult,
    selectedAccountId,
    selectedAccount,
    ledgerMeta,
    eventsMeta,
    isLoading,
    isMutating,
    isSyncing,
    error,
    fetchAccounts,
    fetchLedger,
    setLedgerPage,
    setEventsPage,
    createAccount,
    createAdjustment,
    syncFinancialEvents,
  }
})
