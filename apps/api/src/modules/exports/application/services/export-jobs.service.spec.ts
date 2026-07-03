import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { BadRequestException } from '@nestjs/common';
import { ExportJobFormat, ExportJobStatus, ExportJobType, ProductStatus, ProductType } from '@prisma/client';
import { ExportJobsService } from './export-jobs.service';

describe('ExportJobsService', () => {
  let prisma: any;
  let service: ExportJobsService;
  let storageDir: string;

  beforeEach(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'ledgerflow-export-test-'));
    process.env.EXPORT_STORAGE_DIR = storageDir;
    prisma = {
      exportJob: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      product: { findMany: jest.fn() },
      orderFinancialFact: { findMany: jest.fn() },
      auditLog: { create: jest.fn() },
      outboxEvent: { create: jest.fn() },
    };
    service = new ExportJobsService(prisma);
  });

  afterEach(async () => {
    delete process.env.EXPORT_STORAGE_DIR;
    await rm(storageDir, { recursive: true, force: true });
  });

  it('rejects XLSX until a real spreadsheet writer is available', async () => {
    await expect(
      service.createJob('tenant-1', 'user-1', {
        type: ExportJobType.CATALOG_PRODUCTS,
        format: ExportJobFormat.XLSX,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.exportJob.create).not.toHaveBeenCalled();
  });

  it('streams catalog products into CSV and preserves SKU as spreadsheet text', async () => {
    const pendingJob = {
      id: 'job-1',
      tenantId: 'tenant-1',
      requestedByUserId: 'user-1',
      type: ExportJobType.CATALOG_PRODUCTS,
      format: ExportJobFormat.CSV,
      status: ExportJobStatus.PENDING,
      parameters: null,
      filePath: null,
      fileName: null,
      mimeType: null,
      rowCount: 0,
      errorCode: null,
      errorSummary: null,
      expiresAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date('2026-07-02T10:00:00.000Z'),
      updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    };
    const processingJob = {
      ...pendingJob,
      status: ExportJobStatus.PROCESSING,
      startedAt: new Date('2026-07-02T10:01:00.000Z'),
    };
    let completedJob: any;

    prisma.exportJob.findMany.mockResolvedValueOnce([pendingJob]);
    prisma.exportJob.update.mockImplementation(({ data }: any) => {
      if (data.status === ExportJobStatus.PROCESSING) return Promise.resolve(processingJob);
      completedJob = { ...processingJob, ...data };
      return Promise.resolve(completedJob);
    });
    prisma.product.findMany
      .mockResolvedValueOnce([
        {
          id: 'product-1',
          tenantId: 'tenant-1',
          name: 'Produto com SKU zero',
          type: ProductType.SIMPLE,
          status: ProductStatus.ACTIVE,
          sku: {
            skuDisplay: '00123',
            unitOfMeasure: 'UN',
            averageCost: { toString: () => '10.5000' },
          },
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.processPending('tenant-1', 'user-1');
    const file = await readFile(completedJob.filePath, 'utf8');

    expect(result.processed[0].status).toBe(ExportJobStatus.COMPLETED);
    expect(result.processed[0].rowCount).toBe(1);
    expect(file).toContain('"=""00123"""');
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100, orderBy: { id: 'asc' } }),
    );
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aggregateType: 'ExportJob',
          eventType: 'export.job.completed',
        }),
      }),
    );
  });

  it('cancels pending jobs only', async () => {
    prisma.exportJob.findFirst.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-1',
      type: ExportJobType.CATALOG_PRODUCTS,
      format: ExportJobFormat.CSV,
      status: ExportJobStatus.PENDING,
    });
    prisma.exportJob.update.mockResolvedValue({ id: 'job-1', status: ExportJobStatus.CANCELLED });

    const result = await service.cancelJob('tenant-1', 'user-1', 'job-1');

    expect(result.status).toBe(ExportJobStatus.CANCELLED);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'export.job.cancelled',
          entityId: 'job-1',
        }),
      }),
    );
  });
});
