export const advancedInventoryFeatures = {
  transfers: import.meta.env.VITE_ADVANCED_INVENTORY_TRANSFERS_ENABLED === 'true',
  cycleCounts: import.meta.env.VITE_ADVANCED_INVENTORY_CYCLE_COUNTS_ENABLED === 'true',
} as const
