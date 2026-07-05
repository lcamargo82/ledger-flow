import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChannelProvider } from '@prisma/client';
import { Public } from '../../../auth/presentation/decorators/public.decorator';
import { ChannelWebhookAcceptedResponseDto } from '../../application/dto/channel-response.dto';
import { ChannelWebhookIntakeService } from '../../application/services/channel-webhook-intake.service';

@ApiTags('Channel Webhooks')
@Controller('webhooks/channels')
export class ChannelWebhooksController {
  constructor(private readonly intakeService: ChannelWebhookIntakeService) {}

  @Post(':provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receber webhook genérico de canal de venda' })
  @ApiHeader({
    name: 'x-ledgerflow-channel-secret',
    description: 'Segredo configurado na integração de canal quando exigido pelo provider',
    required: false,
  })
  @ApiOkResponse({ type: ChannelWebhookAcceptedResponseDto })
  @ApiBadRequestResponse({ description: 'Provider ou payload inválido' })
  @ApiForbiddenResponse({ description: 'Segredo de integração inválido' })
  ingest(
    @Param('provider') provider: string,
    @Headers('x-ledgerflow-channel-secret') webhookSecret: string | undefined,
    @Body() payload: unknown,
  ) {
    return this.intakeService.ingest(this.resolveProvider(provider), webhookSecret, payload);
  }

  private resolveProvider(provider: string): ChannelProvider {
    const normalizedProvider = provider.trim().toLowerCase().replaceAll('-', '_');
    const channelProvider = Object.values(ChannelProvider).find(
      (value) => value.toLowerCase() === normalizedProvider,
    );

    if (!channelProvider) {
      throw new BadRequestException('Provider inválido.');
    }

    return channelProvider;
  }
}
