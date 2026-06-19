import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  tenantId: string;

  @ApiProperty({ example: 'Owner' })
  name: string;

  @ApiProperty({ example: 'OWNER' })
  key: string;

  @ApiProperty({
    example: 'Proprietário da conta com acesso total',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: true })
  system: boolean;

  @ApiProperty({ example: ['users:read', 'users:create'] })
  permissions: string[];

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
