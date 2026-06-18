import { ApiProperty } from '@nestjs/swagger';
import { PermissionResponseDto } from './permission-response.dto';

export class PermissionsResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  data: PermissionResponseDto[];
}
