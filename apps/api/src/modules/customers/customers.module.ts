import { Module } from '@nestjs/common';
import { CustomersController } from './presentation/controllers/customers.controller';
import { CustomersService } from './application/services/customers.service';
import { PrismaCustomersRepository } from './infra/repositories/prisma-customers.repository';
import { CUSTOMERS_REPOSITORY } from './domain/repositories/customers.repository';

@Module({
  controllers: [CustomersController],
  providers: [
    CustomersService,
    {
      provide: CUSTOMERS_REPOSITORY,
      useClass: PrismaCustomersRepository,
    },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
