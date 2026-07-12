import { NotFoundException } from '@nestjs/common';
import {
  InventoryAdvancedFeature,
  InventoryAdvancedFeatureService,
} from './inventory-advanced-feature.service';

describe('InventoryAdvancedFeatureService', () => {
  const config = { get: jest.fn() };
  let service: InventoryAdvancedFeatureService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryAdvancedFeatureService(config as never);
  });

  it('keeps advanced inventory features disabled by default', () => {
    config.get.mockReturnValue(undefined);

    expect(service.status()).toEqual({ transfers: false, cycleCounts: false });
  });

  it('enables each feature only through its explicit flag', () => {
    config.get.mockImplementation((key: string) =>
      key === 'ADVANCED_INVENTORY_TRANSFERS_ENABLED' ? 'true' : 'false',
    );

    expect(service.isEnabled(InventoryAdvancedFeature.TRANSFERS)).toBe(true);
    expect(service.isEnabled(InventoryAdvancedFeature.CYCLE_COUNTS)).toBe(false);
  });

  it('fails closed with 404 when a disabled future route is requested', () => {
    config.get.mockReturnValue('false');

    expect(() => service.assertEnabled(InventoryAdvancedFeature.TRANSFERS)).toThrow(
      NotFoundException,
    );
  });
});
