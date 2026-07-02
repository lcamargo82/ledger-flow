import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
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
    description: 'Segredo configurado na integração de canal',
    required: true,
  })
  @ApiOkResponse({ type: ChannelWebhookAcceptedResponseDto })
  @ApiBadRequestResponse({ description: 'Provider ou payload inválido' })
  @ApiForbiddenResponse({ description: 'Segredo de integração inválido' })
  ingest(
    @Param('provider', new ParseEnumPipe(ChannelProvider)) provider: ChannelProvider,
    @Headers('x-ledgerflow-channel-secret') webhookSecret: string | undefined,
    @Body() payload: unknown,
  ) {
    return this.intakeService.ingest(provider, webhookSecret, payload);
  }
}
