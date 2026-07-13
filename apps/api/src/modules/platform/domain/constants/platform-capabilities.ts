export const CommerceCapabilities = {
  CatalogManage: 'catalog.manage',
  InventoryManage: 'inventory.manage',
  InventoryAdjust: 'inventory.adjust',
  OrdersManage: 'orders.manage',
  InventoryReportsRead: 'inventory.reports.read',
  ChannelsConnect: 'channels.connect',
  ChannelsImportListings: 'channels.import_listings',
  ChannelsMappingManage: 'channels.mapping.manage',
  ChannelsSyncInventory: 'channels.sync_inventory',
  OrdersChannelIntake: 'orders.channel_intake',
  FinancialAnalyticsRead: 'financial.analytics.read',
} as const;

export type CommerceCapability = (typeof CommerceCapabilities)[keyof typeof CommerceCapabilities];

export const ReconciliationCapabilities = {
  Read: 'reconciliation.read',
  Manage: 'reconciliation.manage',
  Export: 'reconciliation.export',
  Sync: 'reconciliation.sync',
  MarketplaceSettlementRead: 'marketplace_settlement.read',
  MarketplaceSettlementManage: 'marketplace_settlement.manage',
} as const;

export type ReconciliationCapability =
  (typeof ReconciliationCapabilities)[keyof typeof ReconciliationCapabilities];

export const NotificationCapabilities = {
  Read: 'notifications.read',
  Manage: 'notifications.manage',
} as const;

export type NotificationCapability =
  (typeof NotificationCapabilities)[keyof typeof NotificationCapabilities];

export const InventoryAdvancedCapabilities = {
  Transfer: 'inventory.transfer',
  CycleCount: 'inventory.cycle_count',
  Approval: 'inventory.approval',
  AlertsManage: 'inventory.alerts.manage',
  AgingRead: 'inventory.aging.read',
  KitsManage: 'inventory.kits.manage',
} as const;

export type InventoryAdvancedCapability =
  (typeof InventoryAdvancedCapabilities)[keyof typeof InventoryAdvancedCapabilities];

export type PlatformCapability =
  | CommerceCapability
  | ReconciliationCapability
  | NotificationCapability
  | InventoryAdvancedCapability;
