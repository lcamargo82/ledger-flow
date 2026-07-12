import 'reflect-metadata';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { InventoryAdvancedCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { InventoryAdvancedFoundationController } from './inventory-advanced-foundation.controller';

describe('InventoryAdvancedFoundationController', () => {
  const features = { assertEnabled: jest.fn(), status: jest.fn() };
  const controller = new InventoryAdvancedFoundationController(features as never);

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['transferReasonCodes', 'inventory:transfer', InventoryAdvancedCapabilities.Transfer],
    ['cycleCountReasonCodes', 'inventory:cycle-count', InventoryAdvancedCapabilities.CycleCount],
  ])('protects %s with its narrow permission and capability', (method, permission, capability) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      InventoryAdvancedFoundationController.prototype,
      method,
    );
    if (!descriptor || typeof descriptor.value !== 'function') throw new Error('Method not found');
    const handler = descriptor.value as object;

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler)).toEqual([permission]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, handler)).toEqual([capability]);
  });

  it('returns transfer reason codes only after the feature flag is enabled', () => {
    const result = controller.transferReasonCodes();

    expect(features.assertEnabled).toHaveBeenCalledWith('TRANSFERS');
    expect(result.data[0].code).toBe('REPLENISHMENT');
  });
});
