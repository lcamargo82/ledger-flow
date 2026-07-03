import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import {
  ExportJob,
  ExportJobFormat,
  ExportJobStatus,
  ExportJobType,
  Prisma,
} from '@prisma/client';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { once } from 'events';
import { createHash } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateExportJobDto } from '../dto/create-export-job.dto';
import { ListExportJobsQueryDto } from '../dto/list-export-jobs-query.dto';

const BATCH_SIZE = 100;
const EXPORT_TTL_HOURS = 24;

export interface ExportDownload {
  stream: StreamableFile;
  fileName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class ExportJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(tenantId: string, actorUserId: string, dto: CreateExportJobDto) {
    if (dto.format === ExportJobFormat.XLSX) {
      throw new BadRequestException('XLSX export is reserved until a spreadsheet writer is added.');
    }

    const job = await this.prisma.exportJob.create({
      data: {
        tenantId,
        requestedByUserId: actorUserId,
        type: dto.type,
        format: dto.format,
        status: ExportJobStatus.PENDING,
        parameters: this.normalizeParameters(dto.parameters),
      },
    });

    await this.audit(tenantId, actorUserId, 'export.job.created', job.id, {
      type: job.type,
      format: job.format,
    });

    return job;
  }

  async listJobs(tenantId: string, query: ListExportJobsQueryDto) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 20, 100);
    const where: Prisma.ExportJobWhereInput = {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
    };

    const [data, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exportJob.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  async cancelJob(tenantId: string, actorUserId: string, id: string) {
    const job = await this.getTenantJob(tenantId, id);
    if (job.status !== ExportJobStatus.PENDING) {
      throw new BadRequestException('Only pending export jobs can be cancelled.');
    }

    const cancelled = await this.prisma.exportJob.update({
      where: { id: job.id },
      data: {
        status: ExportJobStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await this.audit(tenantId, actorUserId, 'export.job.cancelled', job.id, {
      type: job.type,
      format: job.format,
    });

    return cancelled;
  }

  async processPending(tenantId: string, actorUserId: string, limit = 5) {
    const jobs = await this.prisma.exportJob.findMany({
      where: { tenantId, status: ExportJobStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 20),
    });

    const processed: ExportJob[] = [];
    for (const job of jobs) {
      processed.push(await this.processJob(tenantId, actorUserId, job));
    }

    return { processed };
  }

  async downloadJob(tenantId: string, actorUserId: string, id: string): Promise<ExportDownload> {
    const job = await this.getTenantJob(tenantId, id);
    if (job.status !== ExportJobStatus.COMPLETED || !job.filePath) {
      throw new BadRequestException('Export job is not ready for download.');
    }
    if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
      await this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: ExportJobStatus.EXPIRED },
      });
      throw new BadRequestException('Export job has expired.');
    }

    const size = (await stat(job.filePath)).size;
    await this.audit(tenantId, actorUserId, 'export.job.downloaded', job.id, {
      type: job.type,
      rowCount: job.rowCount,
    });

    return {
      stream: new StreamableFile(createReadStream(job.filePath)),
      fileName: job.fileName ?? basename(job.filePath),
      mimeType: job.mimeType ?? 'text/csv',
      size,
    };
  }

  private async processJob(tenantId: string, actorUserId: string, job: ExportJob) {
    const started = await this.prisma.exportJob.update({
      where: { id: job.id },
      data: { status: ExportJobStatus.PROCESSING, startedAt: new Date() },
    });

    try {
      const storageDir = await this.ensureStorageDir();
      const fileName = this.buildFileName(started);
      const filePath = join(storageDir, fileName);
      const rowCount = await this.writeCsvFile(started, filePath);
      const completed = await this.prisma.exportJob.update({
        where: { id: started.id },
        data: {
          status: ExportJobStatus.COMPLETED,
          filePath,
          fileName,
          mimeType: 'text/csv',
          rowCount,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + EXPORT_TTL_HOURS * 60 * 60 * 1000),
        },
      });

      await this.audit(tenantId, actorUserId, 'export.job.completed', completed.id, {
        type: completed.type,
        format: completed.format,
        rowCount,
      });
      await this.outbox(tenantId, completed.id, 'export.job.completed', {
        exportJobId: completed.id,
        type: completed.type,
        format: completed.format,
        rowCount,
        expiresAt: completed.expiresAt?.toISOString(),
      });

      return completed;
    } catch (error) {
      const failed = await this.prisma.exportJob.update({
        where: { id: started.id },
        data: {
          status: ExportJobStatus.FAILED,
          errorCode: 'EXPORT_GENERATION_FAILED',
          errorSummary: error instanceof Error ? error.message : 'Unknown export failure.',
          completedAt: new Date(),
        },
      });

      await this.audit(tenantId, actorUserId, 'export.job.failed', failed.id, {
        type: failed.type,
        format: failed.format,
        errorSummary: failed.errorSummary,
      });
      await this.outbox(tenantId, failed.id, 'export.job.failed', {
        exportJobId: failed.id,
        type: failed.type,
        format: failed.format,
        errorCode: failed.errorCode,
        errorSummary: failed.errorSummary,
      });

      return failed;
    }
  }

  private async writeCsvFile(job: ExportJob, filePath: string) {
    const stream = createWriteStream(filePath, { encoding: 'utf8' });
    let rowCount = 0;

    if (job.type === ExportJobType.CATALOG_PRODUCTS) {
      await this.writeLine(stream, ['product_id', 'name', 'type', 'status', 'sku', 'unit', 'average_cost']);
      rowCount = await this.streamCatalogProducts(job.tenantId, stream);
    }
    if (job.type === ExportJobType.ORDER_FINANCIAL_FACTS) {
      await this.writeLine(stream, [
        'fact_id',
        'order_number',
        'order_status',
        'revenue_amount',
        'cogs_amount',
        'gross_margin_amount',
        'currency',
        'calculated_at',
      ]);
      rowCount = await this.streamOrderFinancialFacts(job, stream);
    }
    if (job.type === ExportJobType.RECONCILIATION_CASES) {
      await this.writeLine(stream, [
        'case_id',
        'provider',
        'status',
        'match_type',
        'expected_amount_minor',
        'received_amount_minor',
        'difference_amount_minor',
        'currency',
        'policy_version',
        'provider_event_id',
        'provider_payment_id',
        'external_reference',
        'payment_reference',
        'payment_provider_payment_id',
        'created_at',
        'matched_at',
        'reconciled_at',
      ]);
      rowCount = await this.streamReconciliationCases(job, stream);
    }

    stream.end();
    await once(stream, 'finish');
    return rowCount;
  }

  private async streamCatalogProducts(tenantId: string, stream: NodeJS.WritableStream) {
    let cursor: string | undefined;
    let rowCount = 0;

    while (true) {
      const rows = await this.prisma.product.findMany({
        where: { tenantId },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: { sku: true },
      });

      if (rows.length === 0) break;
      for (const product of rows) {
        await this.writeLine(stream, [
          product.id,
          product.name,
          product.type,
          product.status,
          product.sku?.skuDisplay ? this.preserveAsSpreadsheetText(product.sku.skuDisplay) : '',
          product.sku?.unitOfMeasure ?? '',
          product.sku?.averageCost?.toString() ?? '',
        ]);
        rowCount += 1;
      }
      cursor = rows[rows.length - 1].id;
    }

    return rowCount;
  }

  private async streamOrderFinancialFacts(job: ExportJob, stream: NodeJS.WritableStream) {
    let cursor: string | undefined;
    let rowCount = 0;
    const where = this.buildFinancialFactsWhere(job);

    while (true) {
      const rows = await this.prisma.orderFinancialFact.findMany({
        where,
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });

      if (rows.length === 0) break;
      for (const fact of rows) {
        await this.writeLine(stream, [
          fact.id,
          fact.orderNumber,
          fact.orderStatus,
          fact.revenueAmount.toString(),
          fact.cogsAmount.toString(),
          fact.grossMarginAmount.toString(),
          fact.currency,
          fact.calculatedAt.toISOString(),
        ]);
        rowCount += 1;
      }
      cursor = rows[rows.length - 1].id;
    }

    return rowCount;
  }

  private buildFinancialFactsWhere(job: ExportJob): Prisma.OrderFinancialFactWhereInput {
    const parameters = (job.parameters ?? {}) as Record<string, unknown>;
    const where: Prisma.OrderFinancialFactWhereInput = { tenantId: job.tenantId };
    const dateFrom = typeof parameters.dateFrom === 'string' ? parameters.dateFrom : undefined;
    const dateTo = typeof parameters.dateTo === 'string' ? parameters.dateTo : undefined;

    if (dateFrom || dateTo) {
      where.calculatedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    return where;
  }

  private async streamReconciliationCases(job: ExportJob, stream: NodeJS.WritableStream) {
    let cursor: string | undefined;
    let rowCount = 0;
    const where = this.buildReconciliationCasesWhere(job);

    while (true) {
      const rows = await this.prisma.reconciliationCase.findMany({
        where,
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: {
          settlementEvent: {
            select: {
              providerEventId: true,
              providerPaymentId: true,
              externalReference: true,
            },
          },
          payment: {
            select: {
              reference: true,
              providerPaymentId: true,
            },
          },
        },
      });

      if (rows.length === 0) break;
      for (const reconciliationCase of rows) {
        await this.writeLine(stream, [
          this.preserveAsSpreadsheetText(reconciliationCase.id),
          reconciliationCase.provider,
          reconciliationCase.status,
          reconciliationCase.matchType,
          reconciliationCase.expectedAmountMinor?.toString() ?? '',
          reconciliationCase.receivedAmountMinor?.toString() ?? '',
          reconciliationCase.differenceAmountMinor?.toString() ?? '',
          reconciliationCase.currency,
          reconciliationCase.policyVersion,
          reconciliationCase.settlementEvent.providerEventId,
          reconciliationCase.settlementEvent.providerPaymentId ?? '',
          reconciliationCase.settlementEvent.externalReference ?? '',
          reconciliationCase.payment?.reference ?? '',
          reconciliationCase.payment?.providerPaymentId ?? '',
          reconciliationCase.createdAt.toISOString(),
          reconciliationCase.matchedAt?.toISOString() ?? '',
          reconciliationCase.reconciledAt?.toISOString() ?? '',
        ]);
        rowCount += 1;
      }
      cursor = rows[rows.length - 1].id;
    }

    return rowCount;
  }

  private buildReconciliationCasesWhere(job: ExportJob): Prisma.ReconciliationCaseWhereInput {
    const parameters = (job.parameters ?? {}) as Record<string, unknown>;
    const where: Prisma.ReconciliationCaseWhereInput = { tenantId: job.tenantId };
    const status = typeof parameters.status === 'string' ? parameters.status : undefined;
    const provider = typeof parameters.provider === 'string' ? parameters.provider : undefined;
    const currency = typeof parameters.currency === 'string' ? parameters.currency : undefined;
    const dateFrom = typeof parameters.dateFrom === 'string' ? parameters.dateFrom : undefined;
    const dateTo = typeof parameters.dateTo === 'string' ? parameters.dateTo : undefined;

    if (status) where.status = status as never;
    if (provider) where.provider = provider as never;
    if (currency) where.currency = currency;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    return where;
  }

  private async getTenantJob(tenantId: string, id: string) {
    const job = await this.prisma.exportJob.findFirst({ where: { id, tenantId } });
    if (!job) throw new NotFoundException('Export job not found.');
    return job;
  }

  private normalizeParameters(parameters?: Record<string, unknown>) {
    if (!parameters) return undefined;
    return Object.fromEntries(
      Object.entries(parameters).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)),
    ) as Prisma.InputJsonObject;
  }

  private buildFileName(job: ExportJob) {
    return `${job.type.toLowerCase()}-${job.id}.${job.format.toLowerCase()}`;
  }

  private async ensureStorageDir() {
    const storageDir = process.env.EXPORT_STORAGE_DIR ?? join(tmpdir(), 'ledgerflow-exports');
    await mkdir(storageDir, { recursive: true });
    return storageDir;
  }

  private async writeLine(stream: NodeJS.WritableStream, values: unknown[]) {
    const line = `${values.map((value) => this.toCsvValue(value)).join(',')}\n`;
    if (!stream.write(line)) {
      await once(stream, 'drain');
    }
  }

  private toCsvValue(value: unknown) {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private preserveAsSpreadsheetText(value: string) {
    return `="${value.replace(/"/g, '""')}"`;
  }

  private async audit(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'ExportJob',
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private async outbox(
    tenantId: string,
    exportJobId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: 'ExportJob',
        aggregateId: exportJobId,
        eventType,
        eventVersion: 1,
        payload: payload as Prisma.InputJsonValue,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      },
    });
  }
}
