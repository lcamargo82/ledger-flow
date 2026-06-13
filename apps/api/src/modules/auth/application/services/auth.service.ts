import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { LogoutDto } from '../dto/logout.dto';
import { AuthResponse } from '../types/auth-response.type';
import { AuthTokenPayload } from '../types/auth-token-payload.type';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const email = loginDto.email.trim().toLowerCase();
    const maxAttempts = this.configService.get<number>('AUTH_MAX_FAILED_ATTEMPTS') || 5;
    const lockMinutes = this.configService.get<number>('AUTH_LOCK_MINUTES') || 15;

    let userTenantId: string | null = null;
    let authAttemptStatus = false;
    let failureReason: string | null = null;

    try {
      const user = await this.prisma.user.findFirst({
        where: { email },
        include: {
          roles: {
            include: { role: { include: { permissions: { include: { permission: true } } } } },
          },
        },
      });

      if (!user) {
        failureReason = 'USER_NOT_FOUND';
        throw new UnauthorizedException('Invalid credentials');
      }

      userTenantId = user.tenantId;

      if (!user.active) {
        failureReason = 'USER_INACTIVE';
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        failureReason = 'USER_LOCKED';
        throw new HttpException('Account temporarily locked', HttpStatus.LOCKED); // 423
      }

      const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

      if (!isPasswordValid) {
        failureReason = 'INVALID_PASSWORD';
        const attempts = user.failedLoginAttempts + 1;
        let lockedUntil: Date | null = null;

        if (attempts >= maxAttempts) {
          lockedUntil = new Date();
          lockedUntil.setMinutes(lockedUntil.getMinutes() + lockMinutes);
        }

        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: attempts, lockedUntil },
        });

        throw new UnauthorizedException('Invalid credentials');
      }

      // Successful login
      authAttemptStatus = true;

      // Extract roles and permissions
      const roles = user.roles.map((ur) => ur.role.key);
      const permissionsSet = new Set<string>();
      user.roles.forEach((ur) => {
        ur.role.permissions.forEach((rp) => {
          permissionsSet.add(rp.permission.key);
        });
      });
      const permissions = Array.from(permissionsSet);

      const refreshTokenString = crypto.randomBytes(64).toString('hex');
      const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
      const expiresInStr = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
      const expiresAt = this.parseExpiresIn(expiresInStr);

      // Single session logic: Revoke previous active sessions and refresh tokens
      await this.prisma.userSession.updateMany({
        where: { userId: user.id, active: true },
        data: { active: false, revokedAt: new Date() },
      });

      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      // Transaction to save new session and token
      let sessionId: string;
      await this.prisma.$transaction(async (tx) => {
        const refreshTokenRecord = await tx.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: refreshTokenHash,
            expiresAt,
          },
        });

        const session = await tx.userSession.create({
          data: {
            userId: user.id,
            refreshTokenId: refreshTokenRecord.id,
            ipAddress,
            userAgent,
            expiresAt,
          },
        });
        sessionId = session.id;

        await tx.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
      });

      // Generate access token
      const payload: AuthTokenPayload = {
        sub: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles,
        permissions,
        sessionId: sessionId!,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        refreshToken: refreshTokenString,
        user: {
          id: user.id,
          tenantId: user.tenantId,
          name: user.name,
          email: user.email,
          roles,
          permissions,
          sessionId: sessionId!,
        },
      };
    } finally {
      // Record auth attempt regardless of outcome
      await this.prisma.authAttempt.create({
        data: {
          email,
          tenantId: userTenantId,
          ipAddress,
          userAgent,
          success: authAttemptStatus,
          failureReason,
        },
      });
    }
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
    const { refreshToken } = refreshTokenDto;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: {
              include: { role: { include: { permissions: { include: { permission: true } } } } },
            },
          },
        },
        session: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!storedToken.user.active) {
      throw new UnauthorizedException('User is inactive');
    }

    if (storedToken.session && !storedToken.session.active) {
      throw new UnauthorizedException('Session is inactive');
    }

    // Extract roles and permissions
    const roles = storedToken.user.roles.map((ur) => ur.role.key);
    const permissionsSet = new Set<string>();
    storedToken.user.roles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        permissionsSet.add(rp.permission.key);
      });
    });

    const payload: AuthTokenPayload = {
      sub: storedToken.user.id,
      tenantId: storedToken.user.tenantId,
      email: storedToken.user.email,
      roles,
      permissions: Array.from(permissionsSet),
      sessionId: storedToken.session?.id,
    };

    const accessToken = this.jwtService.sign(payload);

    if (storedToken.session) {
      await this.prisma.userSession.update({
        where: { id: storedToken.session.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return { accessToken };
  }

  async logout(logoutDto: LogoutDto): Promise<{ message: string }> {
    const { refreshToken } = logoutDto;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { session: true },
    });

    if (storedToken) {
      await this.prisma.$transaction(async (tx) => {
        if (!storedToken.revokedAt) {
          await tx.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
          });
        }
        
        if (storedToken.session && storedToken.session.active) {
          await tx.userSession.update({
            where: { id: storedToken.session.id },
            data: { active: false, revokedAt: new Date() },
          });
        }
      });
    }

    return { message: 'Logged out successfully' };
  }

  private parseExpiresIn(expiresIn: string): Date {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);
    const date = new Date();

    switch (unit) {
      case 'm':
        date.setMinutes(date.getMinutes() + value);
        break;
      case 'h':
        date.setHours(date.getHours() + value);
        break;
      case 'd':
        date.setDate(date.getDate() + value);
        break;
      default:
        // Default to 7 days if unparseable
        date.setDate(date.getDate() + 7);
    }

    return date;
  }
}
