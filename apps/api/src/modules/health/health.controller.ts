import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/presentation/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get('liveness')
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readiness')
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
