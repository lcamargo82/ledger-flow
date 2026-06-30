import { Module } from '@nestjs/common';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { PaymentsService } from './application/services/payments.service';
import { PaymentsExternalProcessingService } from './application/services/payments-external-processing.service';
import { PrismaPaymentsRepository } from './infra/repositories/prisma-payments.repository';
import { PaymentReferenceService } from './infra/services/payment-reference.service';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [GatewaysModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsExternalProcessingService,
    PrismaPaymentsRepository,
    PaymentReferenceService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
