import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductType } from '@prisma/client';

export class ProductSkuResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() skuCanonical: string;
  @ApiProperty() skuDisplay: string;
  @ApiPropertyOptional() barcode?: string;
  @ApiProperty() unitOfMeasure: string;
  @ApiProperty() averageCost: string;
  @ApiProperty() currency: string;
}

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty({ enum: ProductType }) type: ProductType;
  @ApiProperty({ enum: ProductStatus }) status: ProductStatus;
  @ApiPropertyOptional() parentProductId?: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() brand?: string;
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() attributes?: Record<string, unknown>;
  @ApiPropertyOptional({ type: ProductSkuResponseDto })
  sku?: ProductSkuResponseDto | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() archivedAt?: Date;
}

export class PaginatedProductsMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() perPage: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  @ApiProperty({ type: PaginatedProductsMetaDto })
  meta: PaginatedProductsMetaDto;
}

export class ProductMutationResponseDto {
  @ApiProperty({ type: ProductResponseDto })
  product: ProductResponseDto;
}
