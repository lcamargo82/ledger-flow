import 'reflect-metadata';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { InventoryAdvancedCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { InventoryAdvancedFeature } from '../../application/services/inventory-advanced-feature.service';
import { InventoryCycleCountsController } from './inventory-cycle-counts.controller';

describe('InventoryCycleCountsController', () => {
  const inventoryService = {
    createCycleCount: jest.fn(),
    listCycleCounts: jest.fn(),
    getCycleCount: jest.fn(),
    openCycleCount: jest.fn(),
    countCycleCountItem: jest.fn(),
    approveCycleCount: jest.fn(),
    cancelCycleCount: jest.fn(),
  };
  const features = { assertEnabled: jest.fn() };
  const controller = new InventoryCycleCountsController(
    inventoryService as never,
    features as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('protects the controller with cycle-count permission and capability', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryCycleCountsController)).toEqual([
      'inventory:cycle-count',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, InventoryCycleCountsController)).toEqual([
      InventoryAdvancedCapabilities.CycleCount,
    ]);
  });

  it('checks the cycle count feature flag before creating a count', async () => {
    inventoryService.createCycleCount.mockResolvedValue({ id: 'count-1' });

    const result = await controller.create({ id: 'user-1', tenantId: 'tenant-1' } as never, {
      warehouseId: 'warehouse-1',
      idempotencyKey: 'cycle-count-key-1',
      reasonCode: 'SCHEDULED_COUNT',
      items: [{ skuId: 'sku-1' }],
    });

    expect(features.assertEnabled).toHaveBeenCalledWith(InventoryAdvancedFeature.CYCLE_COUNTS);
    expect(result.cycleCount.id).toBe('count-1');
  });
});
