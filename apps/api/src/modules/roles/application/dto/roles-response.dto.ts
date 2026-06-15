import { ApiProperty } from '@nestjs/swagger';
import { RoleResponseDto } from './role-response.dto';

export class RolesResponseDto {
  @ApiProperty({ type: [RoleResponseDto] })
  data: RoleResponseDto[];
}
