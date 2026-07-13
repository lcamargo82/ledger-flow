import {
  InventoryReasonContext,
  getInventoryReasonCodes,
  isInventoryReasonCode,
} from './inventory-reason-code-registry';

describe('inventory reason code registry', () => {
  it('returns stable and translatable transfer reason codes', () => {
    expect(getInventoryReasonCodes(InventoryReasonContext.TRANSFER)).toEqual([
      {
        code: 'REPLENISHMENT',
        labelKey: 'inventory.reasonCodes.transfer.REPLENISHMENT',
        requiresNotes: false,
      },
      {
        code: 'REBALANCING',
        labelKey: 'inventory.reasonCodes.transfer.REBALANCING',
        requiresNotes: false,
      },
      {
        code: 'RETURN_TO_STOCK',
        labelKey: 'inventory.reasonCodes.transfer.RETURN_TO_STOCK',
        requiresNotes: false,
      },
      {
        code: 'DAMAGED_STOCK_RELOCATION',
        labelKey: 'inventory.reasonCodes.transfer.DAMAGED_STOCK_RELOCATION',
        requiresNotes: true,
      },
      {
        code: 'OTHER',
        labelKey: 'inventory.reasonCodes.transfer.OTHER',
        requiresNotes: true,
      },
    ]);
  });

  it('validates codes only inside their declared context', () => {
    expect(isInventoryReasonCode(InventoryReasonContext.CYCLE_COUNT, 'SCHEDULED_COUNT')).toBe(true);
    expect(isInventoryReasonCode(InventoryReasonContext.TRANSFER, 'SCHEDULED_COUNT')).toBe(false);
  });
});
