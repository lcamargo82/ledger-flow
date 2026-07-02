import { ApiProperty } from '@nestjs/swagger';
import { ChannelProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateChannelIntegrationDto {
  @ApiProperty({ enum: ChannelProvider, example: ChannelProvider.MOCK })
  @IsEnum(ChannelProvider)
  provider: ChannelProvider;

  @ApiProperty({ example: 'Mock store' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'local-secret-token', minLength: 12 })
  @IsString()
  @MinLength(12)
  webhookSecret: string;
}
