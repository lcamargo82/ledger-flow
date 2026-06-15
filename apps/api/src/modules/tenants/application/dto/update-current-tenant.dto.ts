import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCurrentTenantDto {
  @ApiProperty({ example: 'LedgerFlow Demo Updated', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'America/Sao_Paulo', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  timezone?: string;
}
