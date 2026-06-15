import { ApiProperty } from '@nestjs/swagger';

export class TenantSettingsDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'LedgerFlow Demo' })
  name: string;

  @ApiProperty({ example: 'ledgerflow-demo' })
  slug: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class TenantResponseDto {
  @ApiProperty({ type: TenantSettingsDto })
  tenant: TenantSettingsDto;
}
