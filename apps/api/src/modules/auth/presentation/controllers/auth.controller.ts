import { Controller, Post, Body, Req, HttpCode, HttpStatus, Get } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { LogoutDto } from '../../application/dto/logout.dto';
import { AuthResponse } from '../../application/types/auth-response.type';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../application/types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = this.extractUserAgent(req);

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() logoutDto: LogoutDto): Promise<{ message: string }> {
    return this.authService.logout(logoutDto);
  }

  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  private extractIpAddress(req: Request): string | undefined {
    let ip: string | undefined;
    
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      if (Array.isArray(xForwardedFor)) {
        ip = xForwardedFor[0];
      } else {
        ip = xForwardedFor.split(',')[0];
      }
    } else if (req.headers['x-real-ip']) {
      ip = req.headers['x-real-ip'] as string;
    } else {
      ip = req.ip || req.socket.remoteAddress;
    }

    return ip?.trim();
  }

  private extractUserAgent(req: Request): string | undefined {
    return req.headers['user-agent'];
  }
}
