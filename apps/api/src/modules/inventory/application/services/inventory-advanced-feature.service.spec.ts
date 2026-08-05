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

  it('enables transfers by default and keeps future cycle counts disabled', () => {
    config.get.mockReturnValue(undefined);

    expect(service.status()).toEqual({ transfers: true, cycleCounts: false });
  });

  it('allows each feature to be overridden through its explicit flag', () => {
    config.get.mockImplementation((key: string) =>
      key === 'ADVANCED_INVENTORY_TRANSFERS_ENABLED' ? 'false' : 'true',
    );

    expect(service.isEnabled(InventoryAdvancedFeature.TRANSFERS)).toBe(false);
    expect(service.isEnabled(InventoryAdvancedFeature.CYCLE_COUNTS)).toBe(true);
  });

  it('fails closed with 404 when a disabled future route is requested', () => {
    config.get.mockReturnValue('false');

    expect(() => service.assertEnabled(InventoryAdvancedFeature.TRANSFERS)).toThrow(
      NotFoundException,
    );
  });
});
