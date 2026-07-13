/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WebhookProvider } from '@prisma/client';
import type { Request } from 'express';
import { Public } from '../../../auth/presentation/decorators/public.decorator';
import { WebhookIngressService } from '../../application/services/webhook-ingress.service';
import {
  WebhookAuthenticationError,
  WebhookPayloadInvalidError,
  WebhookProviderNotSupportedError,
} from '../../domain/errors/webhook-errors';

@ApiTags('Webhooks')
@Controller('webhooks/mercado-pago')
export class MercadoPagoWebhooksController {
  constructor(private readonly ingressService: WebhookIngressService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Mercado Pago webhook notification' })
  @ApiHeader({
    name: 'x-signature',
    description: 'Mercado Pago webhook signature. Required when configured.',
    required: false,
  })
  @ApiHeader({
    name: 'x-request-id',
    description: 'Mercado Pago request identifier used in signature validation.',
    required: false,
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook accepted or duplicate ignored.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid payload.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid signature.' })
  async handleWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: any,
    @Req() request: Request & { rawBody?: Buffer },
  ) {
    try {
      await this.ingressService.handleWebhook(
        WebhookProvider.MERCADO_PAGO,
        {
          headers,
          payload,
          rawBody: request.rawBody,
          requestMetadata: {
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        },
        {
          headers,
          payload,
          rawBody: request.rawBody,
          receivedAt: new Date(),
        },
      );

      return { received: true };
    } catch (error) {
      if (error instanceof WebhookAuthenticationError) {
        throw new UnauthorizedException();
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
