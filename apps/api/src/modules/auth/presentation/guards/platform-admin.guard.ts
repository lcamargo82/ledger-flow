import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../../application/types/authenticated-user.type';
import { IS_PLATFORM_ADMIN_ONLY_KEY } from '../decorators/platform-admin-only.decorator';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPlatformAdminOnly = this.reflector.getAllAndOverride<boolean>(
      IS_PLATFORM_ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isPlatformAdminOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('You do not have permission to access platform administration.');
    }

    if (user.tenantKind !== 'PLATFORM') {
      throw new ForbiddenException('You do not have permission to access platform administration.');
    }

    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('You do not have permission to access platform administration.');
    }

    if (!user.permissions.includes('platform:access')) {
      throw new ForbiddenException('You do not have permission to access platform administration.');
    }

    return true;
  }
}
