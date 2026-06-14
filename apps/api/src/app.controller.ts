import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './modules/auth/presentation/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Retorna status básico da API LedgerFlow' })
  @ApiOkResponse({
    description: 'Status da API',
    schema: {
      example: {
        name: 'LedgerFlow API',
        status: 'running',
        environment: 'development',
        timestamp: '2026-06-13T00:00:00.000Z',
      },
    },
  })
  getRoot() {
    return this.appService.getRoot();
  }
}
