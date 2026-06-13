import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'ledgerflow-api',
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness() {
    return {
      status: 'ok',
      check: 'liveness',
      timestamp: new Date().toISOString(),
    };
  }

  getReadiness() {
    return {
      status: 'ok',
      check: 'readiness',
      timestamp: new Date().toISOString(),
    };
  }
}
