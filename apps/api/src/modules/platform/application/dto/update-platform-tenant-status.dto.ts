import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlatformTenantStatusDto {
  @ApiProperty({ description: 'Status do tenant (ativo/inativo)' })
  @IsBoolean()
  active: boolean;
}
