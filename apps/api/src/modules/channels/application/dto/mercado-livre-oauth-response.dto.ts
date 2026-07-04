import { ApiProperty } from '@nestjs/swagger';
import { ChannelIntegrationStatus } from '@prisma/client';

export class MercadoLivreConnectResponseDto {
  @ApiProperty({
    example:
      'https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=...',
  })
  authorizationUrl!: string;
}

export class MercadoLivreCallbackResponseDto {
  @ApiProperty({ example: 'channel-integration-id' })
  integrationId!: string;

  @ApiProperty({ enum: ChannelIntegrationStatus, example: ChannelIntegrationStatus.ACTIVE })
  status!: ChannelIntegrationStatus;
}

export class MercadoLivreDisconnectResponseDto {
  @ApiProperty({ example: true })
  disconnected!: boolean;
}
