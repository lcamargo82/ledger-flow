import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { ReconciliationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { ReconciliationDashboardController } from './reconciliation-dashboard.controller';

describe('ReconciliationDashboardController', () => {
  it('protects dashboard with reconciliation read permission and capability', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReconciliationDashboardController.prototype,
      'getDashboard',
    );

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, descriptor?.value)).toEqual([
      'reconciliation:read',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, descriptor?.value)).toEqual([
      ReconciliationCapabilities.Read,
    ]);
  });
});
