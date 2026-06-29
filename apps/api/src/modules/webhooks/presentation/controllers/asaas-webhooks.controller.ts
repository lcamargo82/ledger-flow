/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { WebhookProvider } from '@prisma/client';
import { Public } from '../../../auth/presentation/decorators/public.decorator';
import { WebhookIngressService } from '../../application/services/webhook-ingress.service';
import {
  WebhookAuthenticationError,
  WebhookPayloadInvalidError,
  WebhookProviderNotSupportedError,
} from '../../domain/errors/webhook-errors';

@ApiTags('Webhooks')
@Controller('webhooks/asaas')
export class AsaasWebhooksController {
  constructor(private readonly ingressService: WebhookIngressService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receber webhook do Asaas Sandbox' })
  @ApiHeader({
    name: 'asaas-access-token',
    description: 'Token de autenticação do webhook configurado no Asaas',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processado com sucesso ou duplicidade ignorada.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payload inválido.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado.',
  })
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: any,
    @Req() request: Request,
  ) {
    try {
      await this.ingressService.handleWebhook(
        WebhookProvider.ASAAS,
        {
          headers,
          payload,
          requestMetadata: {
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        },
        {
          headers,
          payload,
          receivedAt: new Date(),
        },
      );

      return { received: true };
    } catch (error) {
      if (error instanceof WebhookAuthenticationError) {
        throw new UnauthorizedException(); // No details revealed
      }
      if (error instanceof WebhookPayloadInvalidError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof WebhookProviderNotSupportedError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException();
    }
  }
}
