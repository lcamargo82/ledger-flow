import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../../auth/presentation/decorators/public.decorator';
import { WebhookIngressService } from '../../application/services/webhook-ingress.service';
import { AsaasWebhookProcessorService } from '../../application/services/asaas-webhook-processor.service';
import { AsaasWebhookEventDto } from '../../application/dto/asaas-webhook-event.dto';
import {
  WebhookAuthenticationError,
  WebhookPayloadInvalidError,
} from '../../domain/errors/webhook-errors';

@ApiTags('Webhooks')
@Controller('webhooks/asaas')
export class AsaasWebhooksController {
  constructor(
    private readonly ingressService: WebhookIngressService,
    private readonly processorService: AsaasWebhookProcessorService,
  ) {}

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
    @Headers('asaas-access-token') token: string,
    @Body() payload: AsaasWebhookEventDto,
  ) {
    try {
      // 1. Authenticate Request
      this.ingressService.authenticateAsaas(token);

      // 2. Validate basic structure
      if (!payload || !payload.id || !payload.event) {
        throw new WebhookPayloadInvalidError(
          'O payload não contém as informações mínimas necessárias.',
        );
      }

      // 3. Process
      await this.processorService.processEvent(payload);

      return { received: true };
    } catch (error) {
      if (error instanceof WebhookAuthenticationError) {
        throw new UnauthorizedException(); // No details revealed
      }
      if (error instanceof WebhookPayloadInvalidError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException();
    }
  }
}
