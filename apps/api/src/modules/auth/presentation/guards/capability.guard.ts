import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../application/types/authenticated-user.type';
import { CapabilityPolicyService } from '../../../platform/application/services/capability-policy.service';
import {
  REQUIRED_CAPABILITIES_KEY,
} from '../decorators/require-capabilities.decorator';
import type { CommerceCapability } from '../../../platform/domain/constants/platform-capabilities';

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly capabilityPolicy: CapabilityPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities =
      this.reflector.getAllAndOverride<CommerceCapability[]>(
        REQUIRED_CAPABILITIES_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException(
        'User not authenticated for capability check',
      );
    }

    const hasCapabilities = await this.capabilityPolicy.hasCapabilities(
      user.tenantId,
      requiredCapabilities,
    );

    if (!hasCapabilities) {
      throw new ForbiddenException('Insufficient capabilities');
    }

    return true;
  }
}
