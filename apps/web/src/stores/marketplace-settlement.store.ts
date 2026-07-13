import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { marketplaceSettlementService } from '../services/marketplace-settlement.service'
import type {
  CashLedgerEntry,
  CreateCashPositionAdjustmentPayload,
  CreateMarketplaceFinancialAccountPayload,
  MarketplaceFinancialAccount,
} from '../types/marketplace-settlement.types'

export const useMarketplaceSettlementStore = defineStore('marketplace-settlement', () => {
  const accounts = ref<MarketplaceFinancialAccount[]>([])
  const ledgerEntries = ref<CashLedgerEntry[]>([])
  const selectedAccountId = ref<string | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
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
    const response = await marketplaceSettlementService.listLedger(accountId)
    ledgerEntries.value = response.data
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

  return {
    accounts,
    ledgerEntries,
    selectedAccountId,
    selectedAccount,
    isLoading,
    isMutating,
    error,
    fetchAccounts,
    fetchLedger,
    createAccount,
    createAdjustment,
  }
})
