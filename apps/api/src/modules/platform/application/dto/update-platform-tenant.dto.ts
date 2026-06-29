import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformTenantDto {
  @ApiPropertyOptional({ description: 'Nome do tenant' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Fuso horário' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
