import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  AuditSeverity,
  CashLedgerEntry,
  CashLedgerEntryType,
  CashPositionAdjustment,
  CashPositionAdjustmentType,
  OperationalFinancialAccount,
  OperationalFinancialAccountStatus,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { MercadoPagoFinancialReadinessService } from '../../../gateways/application/services/mercado-pago-financial-readiness.service';
import { NotificationProducerService } from '../../../notifications/application/services/notification-producer.service';
import {
  CashLedgerEntryResponseDto,
  CreateCashPositionAdjustmentDto,
  CreateMarketplaceFinancialAccountDto,
  ListCashLedgerEntriesQueryDto,
  MarketplaceFinancialAccountResponseDto,
} from '../dto/marketplace-financial-accounts.dto';

type AccountWithLedger = {
  account: OperationalFinancialAccount;
  ledgerEntry: CashLedgerEntry;
};

type AdjustmentWithLedger = CashPositionAdjustment & {
  cashLedgerEntry: CashLedgerEntry;
};

@Injectable()
export class MarketplaceFinancialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialReadiness: MercadoPagoFinancialReadinessService,
    private readonly notificationProducer?: NotificationProducerService,
  ) {}

  async createAccount(
    tenantId: string,
    actorUserId: string,
    dto: CreateMarketplaceFinancialAccountDto,
  ): Promise<AccountWithLedger> {
    if (dto.provider !== PaymentProvider.MERCADO_PAGO) {
      throw new BadRequestException('Only Mercado Pago financial accounts are supported in 9B-1.');
    }

    const currency = (dto.currency ?? 'BRL').trim().toUpperCase();
    if (currency !== 'BRL') {
      throw new BadRequestException('Only BRL accounts are supported in 9B-1.');
    }

    const name = dto.name.trim();
    const reasonCode = dto.reasonCode.trim();
    const notes = dto.notes?.trim() || null;

    const gatewayConfiguration = await this.prisma.gatewayConfiguration.findFirst({
      where: {
        id: dto.gatewayConfigurationId,
        tenantId,
        provider: PaymentProvider.MERCADO_PAGO,
      },
    });

    if (!gatewayConfiguration) {
      throw new NotFoundException('Mercado Pago gateway connection not found.');
    }

    try {
      this.financialReadiness.assertSettlementReadable(gatewayConfiguration);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'MERCADO_PAGO_FINANCIAL_READINESS_BLOCKED',
      );
    }

    const existing = await this.prisma.operationalFinancialAccount.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
    if (existing) {
      throw new ConflictException('Financial account name already exists.');
    }

    const openingBalance = new Prisma.Decimal(dto.openingBalanceMinor);
    const sourceId = randomUUID();
    const idempotencyKey = `opening-balance:${tenantId}:${sourceId}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const account = await tx.operationalFinancialAccount.create({
        data: {
          tenantId,
          gatewayConfigurationId: gatewayConfiguration.id,
          provider: gatewayConfiguration.provider,
          environment: gatewayConfiguration.environment,
          name,
          currency,
          currencyExponent: 2,
          openingBalanceMinor: openingBalance,
          currentBalanceMinor: openingBalance,
          createdByUserId: actorUserId,
        },
      });

      const ledgerEntry = await tx.cashLedgerEntry.create({
        data: {
          tenantId,
          accountId: account.id,
          type: CashLedgerEntryType.OPENING_BALANCE,
          amountMinor: openingBalance,
          balanceAfterMinor: openingBalance,
          currency,
          currencyExponent: 2,
          sourceType: 'CashPositionAdjustment',
          sourceId,
          idempotencyKey,
          reasonCode,
          notes,
          occurredAt: new Date(),
          createdByUserId: actorUserId,
        },
      });

      await tx.cashPositionAdjustment.create({
        data: {
          tenantId,
          accountId: account.id,
          cashLedgerEntryId: ledgerEntry.id,
          type: CashPositionAdjustmentType.OPENING_BALANCE,
          amountMinor: openingBalance,
          reasonCode,
          notes,
          createdByUserId: actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId,
          actorType: AuditActorType.USER,
          severity: AuditSeverity.INFO,
          source: 'marketplace-settlement',
          entityType: 'OperationalFinancialAccount',
          entityId: account.id,
          action: 'marketplace_settlement.financial_account.created',
          summary: 'Mercado Pago financial account created with opening balance.',
          metadata: {
            provider: account.provider,
            gatewayConfigurationId: account.gatewayConfigurationId,
            openingBalanceMinor: openingBalance.toString(),
            currency,
            reasonCode,
          },
        },
      });

      return { account, ledgerEntry };
    });

    return result;
  }

  async listAccounts(tenantId: string): Promise<MarketplaceFinancialAccountResponseDto[]> {
    const accounts = await this.prisma.operationalFinancialAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => this.mapAccount(account));
  }

  async listLedgerEntries(
    tenantId: string,
    accountId: string,
    query: ListCashLedgerEntriesQueryDto,
  ) {
    await this.assertAccountExists(tenantId, accountId);

    const page = query.page ?? 1;
    const take = Math.min(query.perPage ?? 20, 100);
    const skip = (page - 1) * take;

    const where: Prisma.CashLedgerEntryWhereInput = { tenantId, accountId };
    const [data, total] = await Promise.all([
      this.prisma.cashLedgerEntry.findMany({
        where,
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.cashLedgerEntry.count({ where }),
    ]);

    return {
      data: data.map((entry) => this.mapLedgerEntry(entry)),
      meta: { page, perPage: take, total, totalPages: Math.ceil(total / take) },
    };
  }

  async createAdjustment(
    tenantId: string,
    actorUserId: string,
    accountId: string,
    dto: CreateCashPositionAdjustmentDto,
  ): Promise<AdjustmentWithLedger> {
    const amount = new Prisma.Decimal(dto.amountMinor);
    if (amount.isZero()) {
      throw new BadRequestException('Adjustment amount must be different from zero.');
    }

    const reasonCode = dto.reasonCode.trim();
    const notes = dto.notes.trim();
    const sourceId = randomUUID();
    const idempotencyKey = `manual-adjustment:${tenantId}:${sourceId}`;

    const adjustment = await this.prisma.$transaction(async (tx) => {
      const account = await tx.operationalFinancialAccount.findFirst({
        where: { id: accountId, tenantId, status: OperationalFinancialAccountStatus.ACTIVE },
      });

      if (!account) {
        throw new NotFoundException('Financial account not found.');
      }

      const balanceAfter = new Prisma.Decimal(account.currentBalanceMinor).add(amount);

      const ledgerEntry = await tx.cashLedgerEntry.create({
        data: {
          tenantId,
          accountId: account.id,
          type: CashLedgerEntryType.MANUAL_ADJUSTMENT,
          amountMinor: amount,
          balanceAfterMinor: balanceAfter,
          currency: account.currency,
          currencyExponent: account.currencyExponent,
          sourceType: 'CashPositionAdjustment',
          sourceId,
          idempotencyKey,
          reasonCode,
          notes,
          occurredAt: new Date(),
          createdByUserId: actorUserId,
        },
      });

      const adjustment = await tx.cashPositionAdjustment.create({
        data: {
          tenantId,
          accountId: account.id,
          cashLedgerEntryId: ledgerEntry.id,
          type: CashPositionAdjustmentType.MANUAL_CORRECTION,
          amountMinor: amount,
          reasonCode,
          notes,
          createdByUserId: actorUserId,
        },
        include: { cashLedgerEntry: true },
      });

      await tx.operationalFinancialAccount.update({
        where: { id: account.id },
        data: { currentBalanceMinor: balanceAfter },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId,
          actorType: AuditActorType.USER,
          severity: AuditSeverity.INFO,
          source: 'marketplace-settlement',
          entityType: 'CashPositionAdjustment',
          entityId: adjustment.id,
          action: 'marketplace_settlement.cash_position_adjusted',
          summary: 'Manual cash position adjustment recorded.',
          metadata: {
            accountId: account.id,
            amountMinor: amount.toString(),
            balanceAfterMinor: balanceAfter.toString(),
            reasonCode,
          },
        },
      });

      return adjustment;
    });

    await this.notificationProducer?.cashPositionUnexplainedDifference({
      tenantId,
      accountId,
      differenceAmountMinor: amount.toString(),
      currency: adjustment.cashLedgerEntry.currency,
      detectedAt: adjustment.cashLedgerEntry.occurredAt,
    });

    return adjustment;
  }

  mapAccount(account: OperationalFinancialAccount): MarketplaceFinancialAccountResponseDto {
    return {
      id: account.id,
      provider: account.provider,
      environment: account.environment,
      gatewayConfigurationId: account.gatewayConfigurationId,
      name: account.name,
      currency: account.currency,
      status: account.status,
      openingBalanceMinor: account.openingBalanceMinor.toString(),
      currentBalanceMinor: account.currentBalanceMinor.toString(),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  mapLedgerEntry(entry: CashLedgerEntry): CashLedgerEntryResponseDto {
    return {
      id: entry.id,
      type: entry.type,
      amountMinor: entry.amountMinor.toString(),
      balanceAfterMinor: entry.balanceAfterMinor.toString(),
      currency: entry.currency,
      reasonCode: entry.reasonCode,
      notes: entry.notes,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
    };
  }

  private async assertAccountExists(tenantId: string, accountId: string) {
    const account = await this.prisma.operationalFinancialAccount.findFirst({
      where: { id: accountId, tenantId },
    });

    if (!account) {
      throw new NotFoundException('Financial account not found.');
    }

    return account;
  }
}
