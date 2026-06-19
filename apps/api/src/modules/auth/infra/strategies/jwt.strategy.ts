import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { AuthTokenPayload } from '../../application/types/auth-token-payload.type';
import { AuthenticatedUser } from '../../application/types/authenticated-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'change-me-access-secret',
    });
  }

  async validate(payload: AuthTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.active) {
      throw new UnauthorizedException('User is inactive');
    }

    if (!user.tenant || !user.tenant.active) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    // If the token has a sessionId, validate if that session is still active
    if (payload.sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || !session.active || (session.expiresAt && session.expiresAt < new Date())) {
        throw new UnauthorizedException('Session is inactive or expired');
      }

      // Update lastSeenAt
      this.prisma.userSession
        .update({
          where: { id: payload.sessionId },
          data: { lastSeenAt: new Date() },
        })
        .catch(console.error);
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      roles: payload.roles,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };
  }
}
