import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateChannelIntegrationSettingsDto {
  @ApiPropertyOptional({ example: 'warehouse-uuid', nullable: true })
  @IsOptional()
  @IsString()
  defaultWarehouseId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['AVAILABLE'], default: 'AVAILABLE' })
  @IsOptional()
  @IsIn(['AVAILABLE'])
  stockSyncMode?: 'AVAILABLE';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  importListingsOnConnect?: boolean;

  @ApiPropertyOptional({ description: 'Mercado Livre seller warehouse store_id.' })
  @IsOptional()
  @IsString()
  mercadoLivreWarehouseStoreId?: string | null;

  @ApiPropertyOptional({ description: 'Mercado Livre seller warehouse network_node_id.' })
  @IsOptional()
  @IsString()
  mercadoLivreWarehouseNetworkNodeId?: string | null;
}
