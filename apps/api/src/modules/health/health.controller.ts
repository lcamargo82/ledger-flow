import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/presentation/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retorna status geral da aplicação' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'ledgerflow-api',
        timestamp: '2026-06-13T00:00:00.000Z',
      },
    },
  })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get('liveness')
  @ApiOperation({ summary: 'Valida se o processo da API está vivo' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        check: 'liveness',
        timestamp: '2026-06-13T00:00:00.000Z',
      },
    },
  })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readiness')
  @ApiOperation({
    summary:
      'Valida se a API está pronta para receber tráfego, incluindo conexão com banco de dados',
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        check: 'readiness',
        database: 'ok',
        timestamp: '2026-06-13T00:00:00.000Z',
      },
    },
  })
  @ApiServiceUnavailableResponse({
    schema: {
      example: {
        status: 'error',
        check: 'readiness',
        database: 'error',
        timestamp: '2026-06-13T00:00:00.000Z',
      },
    },
  })
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
