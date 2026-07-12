import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum InventoryAdvancedFeature {
  TRANSFERS = 'TRANSFERS',
  CYCLE_COUNTS = 'CYCLE_COUNTS',
}

const FEATURE_ENV_KEYS: Record<InventoryAdvancedFeature, string> = {
  [InventoryAdvancedFeature.TRANSFERS]: 'ADVANCED_INVENTORY_TRANSFERS_ENABLED',
  [InventoryAdvancedFeature.CYCLE_COUNTS]: 'ADVANCED_INVENTORY_CYCLE_COUNTS_ENABLED',
};

@Injectable()
export class InventoryAdvancedFeatureService {
  constructor(private readonly config: ConfigService) {}

  isEnabled(feature: InventoryAdvancedFeature) {
    return this.config.get<string>(FEATURE_ENV_KEYS[feature]) === 'true';
  }

  status() {
    return {
      transfers: this.isEnabled(InventoryAdvancedFeature.TRANSFERS),
      cycleCounts: this.isEnabled(InventoryAdvancedFeature.CYCLE_COUNTS),
    };
  }

  assertEnabled(feature: InventoryAdvancedFeature): void {
    if (!this.isEnabled(feature)) {
      throw new NotFoundException('Advanced inventory feature is not enabled.');
    }
  }
}
