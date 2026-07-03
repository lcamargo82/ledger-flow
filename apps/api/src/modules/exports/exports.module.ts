import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { ExportJobsService } from './application/services/export-jobs.service';
import { ExportJobsController } from './presentation/controllers/export-jobs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ExportJobsController],
  providers: [ExportJobsService],
  exports: [ExportJobsService],
})
export class ExportsModule {}
