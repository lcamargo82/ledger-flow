import { describe, expect, it } from 'vitest'
import analyticsSource from '../views/AnalyticsView.vue?raw'
import exportsSource from '../views/ExportsView.vue?raw'
import inventoryCycleCountsSource from '../views/InventoryCycleCountsView.vue?raw'
import inventoryFoundationSource from '../views/InventoryFoundationView.vue?raw'
import inventoryTransfersSource from '../views/InventoryTransfersView.vue?raw'
import marketplaceSettlementSource from '../views/MarketplaceSettlementView.vue?raw'
import platformAuditSource from '../views/PlatformAuditView.vue?raw'
import platformTenantsSource from '../views/PlatformTenantsView.vue?raw'
import permissionsSource from '../views/PermissionsView.vue?raw'
import reconciliationSource from '../views/ReconciliationView.vue?raw'

describe('paginated table wiring', () => {
  it('connects reconciliation, analytics and exports metadata to page changes', () => {
    expect(reconciliationSource).toContain(':pagination="reconciliationStore.meta"')
    expect(reconciliationSource).toContain('@update:page="reconciliationStore.setPage"')
    expect(analyticsSource).toContain(':pagination="financialStore.meta"')
    expect(analyticsSource).toContain('@update:page="financialStore.setPage"')
    expect(exportsSource).toContain(':pagination="exportsStore.meta"')
    expect(exportsSource).toContain('@update:page="exportsStore.setPage"')
  })

  it('connects every inventory list to its independent pagination state', () => {
    expect(inventoryFoundationSource).toContain(':pagination="inventoryStore.warehouseMeta"')
    expect(inventoryFoundationSource).toContain(':pagination="inventoryStore.balanceMeta"')
    expect(inventoryFoundationSource).toContain(':pagination="inventoryStore.movementMeta"')
    expect(inventoryFoundationSource).toContain(':pagination="inventoryStore.reservationMeta"')
    expect(inventoryFoundationSource).toContain('@update:page="inventoryStore.setWarehousePage"')
    expect(inventoryFoundationSource).toContain('@update:page="inventoryStore.setBalancePage"')
    expect(inventoryFoundationSource).toContain('@update:page="inventoryStore.setMovementPage"')
    expect(inventoryFoundationSource).toContain('@update:page="inventoryStore.setReservationPage"')

    expect(inventoryTransfersSource).toContain(':pagination="inventoryStore.transferMeta"')
    expect(inventoryTransfersSource).toContain('@update:page="inventoryStore.setTransferPage"')
    expect(inventoryCycleCountsSource).toContain(':pagination="inventoryStore.cycleCountMeta"')
    expect(inventoryCycleCountsSource).toContain('@update:page="inventoryStore.setCycleCountPage"')
  })

  it('connects platform and settlement paginated contracts', () => {
    expect(platformTenantsSource).toContain(':pagination="platformTenantsStore.meta"')
    expect(platformTenantsSource).toContain('@update:page="handlePageChange"')
    expect(platformAuditSource).toContain(':total-pages="auditStore.meta.totalPages"')
    expect(platformAuditSource).toContain('@update:page="handlePageChange"')
    expect(marketplaceSettlementSource).toContain(
      ':total-pages="settlementStore.ledgerMeta.totalPages"',
    )
    expect(marketplaceSettlementSource).toContain(
      ':total-pages="settlementStore.eventsMeta.totalPages"',
    )
    expect(marketplaceSettlementSource).toContain('@update:page="settlementStore.setLedgerPage"')
    expect(marketplaceSettlementSource).toContain('@update:page="settlementStore.setEventsPage"')
  })

  it('paginates the bounded permissions registry in the UI', () => {
    expect(permissionsSource).toContain(':items="paginatedPermissions"')
    expect(permissionsSource).toContain('total: filteredPermissions.length')
    expect(permissionsSource).toContain('@update:page="currentPage = $event"')
  })
})
