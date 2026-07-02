import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class MapChannelListingDto {
  @ApiProperty({ example: '8f43ad0a-8b04-4efa-a18b-5e30d9c7c832' })
  @IsUUID()
  skuId: string;

  @ApiPropertyOptional({ example: 'Conferido na malha fina pelo operador.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
