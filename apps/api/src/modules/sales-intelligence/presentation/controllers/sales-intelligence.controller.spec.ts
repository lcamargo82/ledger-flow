import { REQUIRED_CAPABILITIES_KEY } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { SalesIntelligenceService } from '../../application/services/sales-intelligence.service';
import { SalesIntelligenceController } from './sales-intelligence.controller';

describe('SalesIntelligenceController', () => {
  const list = jest.fn();
  const getSummary = jest.fn();
  const getDetail = jest.fn();
  const getTimeline = jest.fn();
  const service = {
    list,
    getSummary,
    getDetail,
    getTimeline,
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

  it('derives tenant scope from the authenticated user', async () => {
    const query = { page: 1, perPage: 20 };
    await controller.list({ tenantId: 'tenant-1' } as never, query);

    expect(list).toHaveBeenCalledWith('tenant-1', query);
  });

  it('applies the authenticated tenant and filters to the summary', async () => {
    const query = { paymentStatus: 'paid' };
    await controller.getSummary({ tenantId: 'tenant-1' } as never, query);

    expect(getSummary).toHaveBeenCalledWith('tenant-1', query);
  });

  it('passes authenticated field permissions to detail and timeline redaction', async () => {
    const user = {
      tenantId: 'tenant-1',
      permissions: ['sales-intelligence:view-profitability', 'inventory:read'],
    } as never;

    await controller.getDetail(user, 'order-1');
    await controller.getTimeline(user, 'order-1');

    expect(getDetail).toHaveBeenCalledWith('tenant-1', 'order-1', [
      'sales-intelligence:view-profitability',
      'inventory:read',
    ]);
    expect(getTimeline).toHaveBeenCalledWith('tenant-1', 'order-1', [
      'sales-intelligence:view-profitability',
      'inventory:read',
    ]);
  });
});
