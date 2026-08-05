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

const DEFAULT_ENABLED_FEATURES = new Set<InventoryAdvancedFeature>([
  InventoryAdvancedFeature.TRANSFERS,
]);

@Injectable()
export class InventoryAdvancedFeatureService {
  constructor(private readonly config: ConfigService) {}

  isEnabled(feature: InventoryAdvancedFeature) {
    const configured = this.config.get<string>(FEATURE_ENV_KEYS[feature]);
    if (configured != null) return configured === 'true';

    return DEFAULT_ENABLED_FEATURES.has(feature);
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
