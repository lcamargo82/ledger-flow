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

export type CommerceCapability =
  (typeof CommerceCapabilities)[keyof typeof CommerceCapabilities];

export const ReconciliationCapabilities = {
  Read: 'reconciliation.read',
  Manage: 'reconciliation.manage',
  Export: 'reconciliation.export',
  Sync: 'reconciliation.sync',
} as const;

export type ReconciliationCapability =
  (typeof ReconciliationCapabilities)[keyof typeof ReconciliationCapabilities];

export type PlatformCapability = CommerceCapability | ReconciliationCapability;
