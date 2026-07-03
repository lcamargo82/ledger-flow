import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { ReconciliationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { ReconciliationPoliciesController } from './reconciliation-policies.controller';

describe('ReconciliationPoliciesController', () => {
  it('protects list with reconciliation read permission and capability', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReconciliationPoliciesController.prototype,
      'list',
    );

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, descriptor?.value)).toEqual([
      'reconciliation:read',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, descriptor?.value)).toEqual([
      ReconciliationCapabilities.Read,
    ]);
  });

  it.each(['create', 'update', 'deactivate'])(
    'protects %s with reconciliation manage permission and capability',
    (methodName) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        ReconciliationPoliciesController.prototype,
        methodName,
      );

      expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, descriptor?.value)).toEqual([
        'reconciliation:manage',
      ]);
      expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, descriptor?.value)).toEqual([
        ReconciliationCapabilities.Manage,
      ]);
    },
  );
});
