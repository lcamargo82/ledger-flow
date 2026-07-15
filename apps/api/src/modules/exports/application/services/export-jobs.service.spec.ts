import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { BadRequestException } from '@nestjs/common';
import {
  ExportJobFormat,
  ExportJobStatus,
  ExportJobType,
  ProductStatus,
  ProductType,
  ReconciliationCaseStatus,
  ReconciliationMatchType,
  WebhookProvider,
  InternalOrderStatus,
} from '@prisma/client';
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
      reconciliationCase: { findMany: jest.fn() },
      providerSettlementEvent: { findMany: jest.fn() },
      internalOrder: { findMany: jest.fn() },
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

  it('derives protected Sales Intelligence columns from server permissions', async () => {
    prisma.exportJob.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'sales-job', ...data }),
    );

    await service.createSalesIntelligenceJob(
      'tenant-1',
      'user-1',
      ['sales-intelligence:export', 'sales-intelligence:view-profitability'],
      { orderReference: '=unsafe-filter' },
    );

    expect(prisma.exportJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        type: ExportJobType.SALES_INTELLIGENCE,
        parameters: expect.objectContaining({
          includeProfitability: true,
          includeSettlement: false,
        }),
      }),
    });
  });

  it('blocks Sales Intelligence export through the generic report endpoint', async () => {
    await expect(
      service.createJob('tenant-1', 'user-1', {
        type: ExportJobType.SALES_INTELLIGENCE,
        format: ExportJobFormat.CSV,
        parameters: { includeSettlement: true },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('streams Sales Intelligence in bounded batches and neutralizes formulas', async () => {
    const pendingJob = {
      id: 'sales-volume-job',
      tenantId: 'tenant-1',
      requestedByUserId: 'user-1',
      type: ExportJobType.SALES_INTELLIGENCE,
      format: ExportJobFormat.CSV,
      status: ExportJobStatus.PENDING,
      parameters: { includeProfitability: false, includeSettlement: false },
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
      createdAt: new Date('2026-07-14T12:00:00.000Z'),
      updatedAt: new Date('2026-07-14T12:00:00.000Z'),
    };
    let completedJob: any;
    prisma.exportJob.findMany.mockResolvedValueOnce([pendingJob]);
    prisma.exportJob.update.mockImplementation(({ data }: any) => {
      if (data.status === ExportJobStatus.PROCESSING) {
        return Promise.resolve({ ...pendingJob, ...data });
      }
      completedJob = { ...pendingJob, ...data };
      return Promise.resolve(completedJob);
    });
    const orders = Array.from({ length: 101 }, (_, index) => ({
      id: `order-${String(index).padStart(3, '0')}`,
      orderNumber: index === 0 ? '=FORMULA()' : `ML-${index}`,
      status: InternalOrderStatus.FULFILLED,
      createdAt: new Date('2026-07-14T12:00:00.000Z'),
      items: [],
      financialFacts: [],
      reconciliationCases: [],
    }));
    prisma.internalOrder.findMany
      .mockResolvedValueOnce(orders.slice(0, 100))
      .mockResolvedValueOnce(orders.slice(100))
      .mockResolvedValueOnce([]);

    await service.processSalesIntelligencePending('tenant-1', 'user-1');
    const file = await readFile(completedJob.filePath, 'utf8');

    expect(completedJob.rowCount).toBe(101);
    expect(prisma.internalOrder.findMany).toHaveBeenCalledTimes(3);
    expect(prisma.internalOrder.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ take: 100, cursor: { id: 'order-099' }, skip: 1 }),
    );
    expect(file).toContain('"\'=FORMULA()"');
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

  it('streams reconciliation cases into CSV with tenant-scoped filters', async () => {
    const pendingJob = {
      id: 'job-reconciliation',
      tenantId: 'tenant-1',
      requestedByUserId: 'user-1',
      type: ExportJobType.RECONCILIATION_CASES,
      format: ExportJobFormat.CSV,
      status: ExportJobStatus.PENDING,
      parameters: {
        status: ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
        provider: WebhookProvider.ASAAS,
        dateFrom: '2026-07-01T00:00:00.000Z',
        dateTo: '2026-07-03T23:59:59.999Z',
      },
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
      createdAt: new Date('2026-07-03T10:00:00.000Z'),
      updatedAt: new Date('2026-07-03T10:00:00.000Z'),
    };
    const processingJob = {
      ...pendingJob,
      status: ExportJobStatus.PROCESSING,
      startedAt: new Date('2026-07-03T10:01:00.000Z'),
    };
    let completedJob: any;

    prisma.exportJob.findMany.mockResolvedValueOnce([pendingJob]);
    prisma.exportJob.update.mockImplementation(({ data }: any) => {
      if (data.status === ExportJobStatus.PROCESSING) return Promise.resolve(processingJob);
      completedJob = { ...processingJob, ...data };
      return Promise.resolve(completedJob);
    });
    prisma.reconciliationCase.findMany
      .mockResolvedValueOnce([
        {
          id: 'case-001',
          provider: WebhookProvider.ASAAS,
          status: ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
          matchType: ReconciliationMatchType.PROVIDER_PAYMENT_ID,
          expectedAmountMinor: { toString: () => '12345' },
          receivedAmountMinor: { toString: () => '12000' },
          differenceAmountMinor: { toString: () => '-345' },
          currency: 'BRL',
          policyVersion: 3,
          settlementEvent: {
            providerEventId: 'evt-001',
            providerPaymentId: 'pay-001',
            externalReference: 'LF-001',
          },
          payment: {
            reference: 'LF-001',
            providerPaymentId: 'pay-001',
          },
          createdAt: new Date('2026-07-03T10:00:00.000Z'),
          matchedAt: null,
          reconciledAt: null,
        },
      ])
      .mockResolvedValueOnce([]);

    await service.processPending('tenant-1', 'user-1');
    expect(completedJob.filePath).toEqual(expect.any(String));
    const file = await readFile(completedJob.filePath, 'utf8');

    expect(completedJob.rowCount).toBe(1);
    expect(file).toContain('"case_id","provider","status","match_type"');
    expect(file).toContain('"=""case-001"""');
    expect(file).toContain('"AMOUNT_DIVERGENCE"');
    expect(prisma.reconciliationCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          status: ReconciliationCaseStatus.AMOUNT_DIVERGENCE,
          provider: WebhookProvider.ASAAS,
          createdAt: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-03T23:59:59.999Z'),
          },
        },
        take: 100,
        orderBy: { id: 'asc' },
      }),
    );
  });

  it('streams marketplace settlement events into CSV with tenant-scoped account filters', async () => {
    const pendingJob = {
      id: 'job-marketplace-settlement',
      tenantId: 'tenant-1',
      requestedByUserId: 'user-1',
      type: ExportJobType.MARKETPLACE_SETTLEMENT_EVENTS,
      format: ExportJobFormat.CSV,
      status: ExportJobStatus.PENDING,
      parameters: {
        operationalFinancialAccountId: 'account-1',
        provider: WebhookProvider.MERCADO_PAGO,
        dateFrom: '2026-07-01T00:00:00.000Z',
        dateTo: '2026-07-31T23:59:59.999Z',
      },
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
      createdAt: new Date('2026-07-13T10:00:00.000Z'),
      updatedAt: new Date('2026-07-13T10:00:00.000Z'),
    };
    const processingJob = {
      ...pendingJob,
      status: ExportJobStatus.PROCESSING,
      startedAt: new Date('2026-07-13T10:01:00.000Z'),
    };
    let completedJob: any;

    prisma.exportJob.findMany.mockResolvedValueOnce([pendingJob]);
    prisma.exportJob.update.mockImplementation(({ data }: any) => {
      if (data.status === ExportJobStatus.PROCESSING) return Promise.resolve(processingJob);
      completedJob = { ...processingJob, ...data };
      return Promise.resolve(completedJob);
    });
    prisma.providerSettlementEvent.findMany
      .mockResolvedValueOnce([
        {
          id: 'settlement-001',
          operationalFinancialAccountId: 'account-1',
          provider: WebhookProvider.MERCADO_PAGO,
          providerEventId: 'mp-payment:gateway-1:123',
          providerPaymentId: '123',
          externalReference: '2000000001',
          eventType: 'payment',
          providerStatus: 'approved',
          amountMinor: { toString: () => '10000' },
          feeAmountMinor: { toString: () => '500' },
          netAmountMinor: { toString: () => '9500' },
          currency: 'BRL',
          occurredAt: new Date('2026-07-13T09:00:00.000Z'),
          availableAt: new Date('2026-07-14T09:00:00.000Z'),
          receivedAt: new Date('2026-07-13T09:05:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);

    await service.processPending('tenant-1', 'user-1');
    const file = await readFile(completedJob.filePath, 'utf8');

    expect(completedJob.rowCount).toBe(1);
    expect(file).toContain('"settlement_event_id","financial_account_id","provider"');
    expect(file).toContain('"=""settlement-001"""');
    expect(file).toContain('"mp-payment:gateway-1:123"');
    expect(file).toContain('"9500"');
    expect(prisma.providerSettlementEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          operationalFinancialAccountId: 'account-1',
          provider: WebhookProvider.MERCADO_PAGO,
          occurredAt: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lte: new Date('2026-07-31T23:59:59.999Z'),
          },
        },
        take: 100,
        orderBy: { id: 'asc' },
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
