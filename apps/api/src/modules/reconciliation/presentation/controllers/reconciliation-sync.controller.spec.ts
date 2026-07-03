import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { ReconciliationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { ReconciliationSyncResponseDto } from '../../application/dto/reconciliation-sync-response.dto';
import { ReconciliationSyncController } from './reconciliation-sync.controller';

describe('ReconciliationSyncController', () => {
  it('protects Asaas sync with reconciliation sync permission and capability', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReconciliationSyncController.prototype,
      'syncAsaas',
    );

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, descriptor?.value)).toEqual([
      'reconciliation:sync',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, descriptor?.value)).toEqual([
      ReconciliationCapabilities.Sync,
    ]);
  });

  it('documents the sync summary response for OpenAPI clients', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReconciliationSyncController.prototype,
      'syncAsaas',
    );

    const responses = Reflect.getMetadata(
      'swagger/apiResponse',
      descriptor?.value,
    );

    expect(responses[200].type).toBe(ReconciliationSyncResponseDto);
  });
});
