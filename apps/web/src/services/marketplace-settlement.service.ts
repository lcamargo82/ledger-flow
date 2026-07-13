import { httpClient } from './http-client'
import type {
  CashLedgerEntriesResponse,
  CreateCashPositionAdjustmentPayload,
  CreateMarketplaceFinancialAccountPayload,
  MarketplaceFinancialAccount,
  MarketplaceFinancialAccountsResponse,
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
}

export const marketplaceSettlementService = new MarketplaceSettlementService()
