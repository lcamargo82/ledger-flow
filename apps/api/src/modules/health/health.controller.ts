import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/presentation/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/presentation/decorators/require-permissions.decorator';
import { PlatformAdminOnly } from '../auth/presentation/decorators/platform-admin-only.decorator';

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

  @Public()
  @Get('settlement')
  @ApiOperation({
    summary: 'Retorna snapshot sanitizado de saúde operacional do settlement marketplace',
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'attention',
        check: 'marketplace-settlement',
        window: '24h',
        settlementEventsLast24h: 12,
        openDivergenceCases: 2,
        webhookDeliveriesInDlq: 0,
        failedExports: 0,
        sanitized: true,
        timestamp: '2026-07-13T00:00:00.000Z',
      },
    },
  })
  async getSettlementHealth() {
    return this.healthService.getSettlementHealth();
  }

  @Get('sales-intelligence')
  @ApiBearerAuth('access-token')
  @PlatformAdminOnly()
  @RequirePermissions('platform:tenants:health:read')
  @ApiOperation({
    summary: 'Retorna snapshot sanitizado de saúde operacional da inteligência de vendas',
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        check: 'sales-intelligence',
        window: '24h',
        currentFactsCalculatedLast24h: 25,
        saleAlertsLast24h: 2,
        webhookDeliveriesInDlq: 0,
        failedExports: 0,
        sanitized: true,
        timestamp: '2026-07-14T00:00:00.000Z',
      },
    },
  })
  async getSalesIntelligenceHealth() {
    return this.healthService.getSalesIntelligenceHealth();
  }
}
