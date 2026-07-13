import { httpClient } from './http-client'
import type {
  CashLedgerEntriesResponse,
  CreateCashPositionAdjustmentPayload,
  CreateMarketplaceFinancialAccountPayload,
  MarketplaceFinancialAccount,
  MarketplaceFinancialAccountsResponse,
  MarketplaceSettlementDashboard,
  MarketplaceSettlementEventsResponse,
  MarketplaceSettlementImportedTotals,
  MarketplaceSettlementSyncResult,
  SyncMarketplaceFinancialEventsPayload,
} from '../types/marketplace-settlement.types'

export class MarketplaceSettlementService {
  async listFinancialAccounts(): Promise<MarketplaceFinancialAccountsResponse> {
    const { data } = await httpClient.get<MarketplaceFinancialAccountsResponse>(
      '/marketplace-settlement/financial-accounts',
    )
    return data
  }

  async createFinancialAccount(
    payload: CreateMarketplaceFinancialAccountPayload,
  ): Promise<{ account: MarketplaceFinancialAccount }> {
    const { data } = await httpClient.post<{ account: MarketplaceFinancialAccount }>(
      '/marketplace-settlement/financial-accounts',
      payload,
    )
    return data
  }

  async listLedger(accountId: string): Promise<CashLedgerEntriesResponse> {
    const { data } = await httpClient.get<CashLedgerEntriesResponse>(
      `/marketplace-settlement/financial-accounts/${accountId}/ledger`,
    )
    return data
  }

  async createAdjustment(
    accountId: string,
    payload: CreateCashPositionAdjustmentPayload,
  ): Promise<void> {
    await httpClient.post(
      `/marketplace-settlement/financial-accounts/${accountId}/adjustments`,
      payload,
    )
  }

  async syncFinancialEvents(
    accountId: string,
    payload: SyncMarketplaceFinancialEventsPayload,
  ): Promise<MarketplaceSettlementSyncResult> {
    const { data } = await httpClient.post<MarketplaceSettlementSyncResult>(
      `/marketplace-settlement/financial-accounts/${accountId}/sync`,
      payload,
    )
    return data
  }

  async listEvents(accountId: string): Promise<MarketplaceSettlementEventsResponse> {
    const { data } = await httpClient.get<MarketplaceSettlementEventsResponse>(
      `/marketplace-settlement/financial-accounts/${accountId}/events`,
    )
    return data
  }

  async getTotals(accountId: string): Promise<MarketplaceSettlementImportedTotals> {
    const { data } = await httpClient.get<MarketplaceSettlementImportedTotals>(
      `/marketplace-settlement/financial-accounts/${accountId}/totals`,
    )
    return data
  }

  async getDashboard(accountId: string): Promise<MarketplaceSettlementDashboard> {
    const { data } = await httpClient.get<MarketplaceSettlementDashboard>(
      `/marketplace-settlement/financial-accounts/${accountId}/dashboard`,
    )
    return data
  }
}

export const marketplaceSettlementService = new MarketplaceSettlementService()
