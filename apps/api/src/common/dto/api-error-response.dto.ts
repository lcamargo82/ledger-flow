import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ description: 'HTTP Status Code', example: 400 })
  statusCode: number;

  @ApiProperty({ description: 'Error message or messages array', example: 'Validation failed' })
  message: string | string[];

  @ApiPropertyOptional({ description: 'Error name or type', example: 'Bad Request' })
  error?: string;

  @ApiPropertyOptional({
    description: 'Timestamp of the error',
    example: '2026-06-13T00:00:00.000Z',
  })
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Request path where error occurred', example: '/auth/login' })
  path?: string;
}
