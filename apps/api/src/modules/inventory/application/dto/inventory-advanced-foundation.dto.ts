import { ApiProperty } from '@nestjs/swagger';

export class InventoryReasonCodeResponseDto {
  @ApiProperty({ example: 'REPLENISHMENT' }) code: string;
  @ApiProperty({ example: 'inventory.reasonCodes.transfer.REPLENISHMENT' }) labelKey: string;
  @ApiProperty() requiresNotes: boolean;
}

export class InventoryReasonCodesResponseDto {
  @ApiProperty({ type: [InventoryReasonCodeResponseDto] })
  data: InventoryReasonCodeResponseDto[];
}

export class InventoryAdvancedFeatureStatusResponseDto {
  @ApiProperty({ example: false }) transfers: boolean;
  @ApiProperty({ example: false }) cycleCounts: boolean;
}
