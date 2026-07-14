import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { SalesIntelligenceService } from '../../application/services/sales-intelligence.service';
import { SalesIntelligenceController } from './sales-intelligence.controller';

describe('SalesIntelligenceController', () => {
  const list = jest.fn();
  const getSummary = jest.fn();
  const service = {
    list,
    getSummary,
  } as unknown as SalesIntelligenceService;
  const controller = new SalesIntelligenceController(service);

  beforeEach(() => jest.clearAllMocks());

  it('protects the read layer with its dedicated permission and capability', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesIntelligenceController)).toEqual([
      'sales-intelligence:read',
    ]);
    expect(Reflect.getMetadata(REQUIRED_CAPABILITIES_KEY, SalesIntelligenceController)).toEqual([
      CommerceCapabilities.SalesIntelligenceRead,
    ]);
  });

  it('derives tenant scope from the authenticated user', () => {
    const query = { page: 1, perPage: 20 };
    controller.list({ tenantId: 'tenant-1' } as never, query);

    expect(list).toHaveBeenCalledWith('tenant-1', query);
  });
});
