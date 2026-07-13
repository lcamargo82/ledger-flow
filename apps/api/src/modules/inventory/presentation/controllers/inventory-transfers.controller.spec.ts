import 'reflect-metadata';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { InventoryAdvancedCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { InventoryAdvancedFeature } from '../../application/services/inventory-advanced-feature.service';
import { InventoryTransfersController } from './inventory-transfers.controller';

describe('InventoryTransfersController', () => {
  const inventoryService = {
    createTransfer: jest.fn(),
    listTransfers: jest.fn(),
    getTransfer: jest.fn(),
    updateTransferDraft: jest.fn(),
    startTransfer: jest.fn(),
    completeTransfer: jest.fn(),
    cancelTransfer: jest.fn(),
  };
  const features = { assertEnabled: jest.fn() };
  const controller = new InventoryTransfersController(inventoryService as never, features as never);

  beforeEach(() => jest.clearAllMocks());

  it('protects the controller with transfer permission and capability', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryTransfersController)).toEqual([
      'inventory:transfer',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, InventoryTransfersController)).toEqual([
      InventoryAdvancedCapabilities.Transfer,
    ]);
  });

  it('checks the transfer feature flag before creating a transfer', async () => {
    inventoryService.createTransfer.mockResolvedValue({ id: 'transfer-1' });

    const result = await controller.create({ id: 'user-1', tenantId: 'tenant-1' } as never, {
      sourceWarehouseId: 'warehouse-source',
      destinationWarehouseId: 'warehouse-destination',
      idempotencyKey: 'transfer-key-1',
      reasonCode: 'REPLENISHMENT',
      items: [{ skuId: 'sku-1', quantity: 1 }],
    });

    expect(features.assertEnabled).toHaveBeenCalledWith(InventoryAdvancedFeature.TRANSFERS);
    expect(result.transfer.id).toBe('transfer-1');
  });
});
