import { Controller, Post, Body, Req, HttpCode, HttpStatus, Get } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { LogoutDto } from '../../application/dto/logout.dto';
import { ForgotPasswordDto } from '../../application/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../application/dto/reset-password.dto';
import { AcceptTenantInvitationDto } from '../../application/dto/accept-tenant-invitation.dto';
import { AuthResponse } from '../../application/types/auth-response.type';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../application/types/authenticated-user.type';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  LoginResponseDto,
  RefreshTokenResponseDto,
  LogoutResponseDto,
  MeResponseDto,
} from '../../application/dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    type: LoginResponseDto,
    description: 'Autentica o usuário e retorna o access e refresh tokens',
  })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = this.extractUserAgent(req);

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    type: RefreshTokenResponseDto,
    description: 'Gera um novo access token a partir de um refresh token',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou revogado' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string }> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({
    type: LogoutResponseDto,
    description: 'Revoga o refresh token e encerra a sessão',
  })
  async logout(@Body() logoutDto: LogoutDto): Promise<{ message: string }> {
    return this.authService.logout(logoutDto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiOkResponse({
    type: MeResponseDto,
    description: 'Retorna o usuário autenticado com roles, permissões, tenantId e sessionId',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password recovery' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Se o e-mail existir, as instruções de recuperação serão enviadas.',
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  // @ApiTooManyRequestsResponse({ description: 'Muitas requisições (TODO: rate limit)' }) // TODO: Implement rate limiting
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = this.extractUserAgent(req);

    return this.authService.forgotPassword(forgotPasswordDto, ipAddress, userAgent);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Senha redefinida com sucesso' })
  @ApiBadRequestResponse({ description: 'Token inválido ou expirado' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = this.extractUserAgent(req);

    return this.authService.resetPassword(resetPasswordDto, ipAddress, userAgent);
  }

  @Public()
  @Post('accept-tenant-invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept tenant invitation and set password' })
  @ApiBody({ type: AcceptTenantInvitationDto })
  @ApiOkResponse({ description: 'Conta ativada com sucesso' })
  @ApiBadRequestResponse({ description: 'Token inválido ou expirado' })
  async acceptTenantInvitation(
    @Body() dto: AcceptTenantInvitationDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = this.extractUserAgent(req);

    return this.authService.acceptTenantInvitation(dto, ipAddress, userAgent);
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
