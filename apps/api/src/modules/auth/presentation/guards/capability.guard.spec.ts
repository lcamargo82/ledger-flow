import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CapabilityGuard } from './capability.guard';
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { REQUIRED_CAPABILITIES_KEY } from '../decorators/require-capabilities.decorator';

describe('CapabilityGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as jest.Mocked<Reflector>;

  const capabilityPolicy = {
    hasCapabilities: jest.fn(),
  };

  const createContext = (user?: { tenantId: string }): ExecutionContext =>
    ({
      getHandler: jest.fn(() => function handler() {}),
      getClass: jest.fn(() => class TestController {}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  let guard: CapabilityGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new CapabilityGuard(reflector, capabilityPolicy as never);
  });

  it('allows routes without required capabilities metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('allows authenticated tenant users with all required capabilities', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      CommerceCapabilities.InventoryManage,
    ]);
    capabilityPolicy.hasCapabilities.mockResolvedValue(true);

    await expect(
      guard.canActivate(createContext({ tenantId: 'tenant-1' })),
    ).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRED_CAPABILITIES_KEY,
      [expect.any(Function), expect.any(Function)],
    );
    expect(capabilityPolicy.hasCapabilities).toHaveBeenCalledWith('tenant-1', [
      CommerceCapabilities.InventoryManage,
    ]);
  });

  it('throws 403 when the tenant lacks a required capability', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      CommerceCapabilities.InventoryManage,
    ]);
    capabilityPolicy.hasCapabilities.mockResolvedValue(false);

    await expect(
      guard.canActivate(createContext({ tenantId: 'tenant-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
