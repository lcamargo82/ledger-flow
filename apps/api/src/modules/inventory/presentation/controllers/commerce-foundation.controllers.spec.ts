import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { CatalogFoundationController } from '../../../catalog/presentation/controllers/catalog-foundation.controller';
import { InventoryFoundationController } from './inventory-foundation.controller';
import { OrdersFoundationController } from '../../../orders/presentation/controllers/orders-foundation.controller';
import { ChannelsFoundationController } from '../../../channels/presentation/controllers/channels-foundation.controller';
import { FinancialIntelligenceFoundationController } from '../../../financial-intelligence/presentation/controllers/financial-intelligence-foundation.controller';

const API_TAGS_METADATA_KEY = 'swagger/apiUseTags';

describe('Commerce foundation controllers', () => {
  it('protects the inventory foundation endpoint with permission and capability metadata', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      InventoryFoundationController.prototype,
      'getStatus',
    );

    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        descriptor?.value,
      ),
    ).toEqual(['inventory:read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        descriptor?.value,
      ),
    ).toEqual([CommerceCapabilities.InventoryManage]);
  });

  it.each([
    [CatalogFoundationController, 'Catalog'],
    [InventoryFoundationController, 'Inventory'],
    [OrdersFoundationController, 'Orders'],
    [ChannelsFoundationController, 'Channels'],
    [FinancialIntelligenceFoundationController, 'Financial Intelligence'],
  ])('documents %s with an OpenAPI tag', (controller, tag) => {
    expect(Reflect.getMetadata(API_TAGS_METADATA_KEY, controller)).toContain(
      tag,
    );
  });
});
