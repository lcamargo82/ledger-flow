import { Module } from '@nestjs/common';
import { PaymentsController } from './presentation/controllers/payments.controller';
import { PaymentsService } from './application/services/payments.service';
import { PrismaPaymentsRepository } from './infra/repositories/prisma-payments.repository';
import { PaymentReferenceService } from './infra/services/payment-reference.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PrismaPaymentsRepository,
    PaymentReferenceService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
