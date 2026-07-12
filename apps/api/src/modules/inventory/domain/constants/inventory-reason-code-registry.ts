export enum InventoryReasonContext {
  TRANSFER = 'TRANSFER',
  CYCLE_COUNT = 'CYCLE_COUNT',
}

export interface InventoryReasonCodeDefinition {
  code: string;
  labelKey: string;
  requiresNotes: boolean;
}

interface InventoryReasonCodeSeed {
  code: string;
  requiresNotes: boolean;
}

const INVENTORY_REASON_CODES: Record<InventoryReasonContext, readonly InventoryReasonCodeSeed[]> = {
  [InventoryReasonContext.TRANSFER]: [
    { code: 'REPLENISHMENT', requiresNotes: false },
    { code: 'REBALANCING', requiresNotes: false },
    { code: 'RETURN_TO_STOCK', requiresNotes: false },
    { code: 'DAMAGED_STOCK_RELOCATION', requiresNotes: true },
    { code: 'OTHER', requiresNotes: true },
  ],
  [InventoryReasonContext.CYCLE_COUNT]: [
    { code: 'SCHEDULED_COUNT', requiresNotes: false },
    { code: 'DISCREPANCY_RECOUNT', requiresNotes: false },
    { code: 'AUDIT_REQUEST', requiresNotes: false },
    { code: 'LOSS_OR_DAMAGE', requiresNotes: true },
    { code: 'OTHER', requiresNotes: true },
  ],
};

export const getInventoryReasonCodes = (
  context: InventoryReasonContext,
): InventoryReasonCodeDefinition[] =>
  INVENTORY_REASON_CODES[context].map((reason) => ({
    ...reason,
    labelKey: `inventory.reasonCodes.${context === InventoryReasonContext.TRANSFER ? 'transfer' : 'cycleCount'}.${reason.code}`,
  }));

export const isInventoryReasonCode = (context: InventoryReasonContext, code: string): boolean =>
  INVENTORY_REASON_CODES[context].some((reason) => reason.code === code);
