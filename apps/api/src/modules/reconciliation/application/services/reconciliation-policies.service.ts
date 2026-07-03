import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReconciliationPolicy } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CreateReconciliationPolicyDto,
  UpdateReconciliationPolicyDto,
} from '../dto/create-reconciliation-policy.dto';
import { ListReconciliationPoliciesQueryDto } from '../dto/list-reconciliation-policies-query.dto';

@Injectable()
export class ReconciliationPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPolicies(tenantId: string, query: ListReconciliationPoliciesQueryDto) {
    return this.prisma.reconciliationPolicy.findMany({
      where: {
        tenantId,
        ...(query.provider !== undefined && { provider: query.provider }),
        ...(query.currency && { currency: query.currency }),
        ...(query.isActive !== undefined && { isActive: query.isActive }),
      },
      orderBy: [{ currency: 'asc' }, { provider: 'asc' }, { version: 'desc' }],
    });
  }

  async createPolicy(
    tenantId: string,
    actorUserId: string,
    dto: CreateReconciliationPolicyDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const provider = dto.provider ?? null;
      const previous = await this.findLatestPolicy(
        tx,
        tenantId,
        provider,
        dto.currency,
      );
      const created = await this.createNextVersion(tx, tenantId, {
        provider,
        currency: dto.currency,
        currencyExponent: dto.currencyExponent ?? previous?.currencyExponent ?? 2,
        amountToleranceMinor: dto.amountToleranceMinor,
        version: (previous?.version ?? 0) + 1,
      });

      await this.audit(tx, tenantId, actorUserId, 'reconciliation.policy.created', created);

      return created;
    });
  }

  async updatePolicy(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: UpdateReconciliationPolicyDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.reconciliationPolicy.findFirst({
        where: { id, tenantId },
      });
      if (!current) {
        throw new NotFoundException('Reconciliation policy not found.');
      }

      const provider = dto.provider ?? current.provider;
      const currency = dto.currency ?? current.currency;
      const previous = await this.findLatestPolicy(tx, tenantId, provider, currency);
      const created = await this.createNextVersion(tx, tenantId, {
        provider,
        currency,
        currencyExponent: dto.currencyExponent ?? current.currencyExponent,
        amountToleranceMinor:
          dto.amountToleranceMinor ?? current.amountToleranceMinor.toString(),
        version: (previous?.version ?? current.version) + 1,
      });

      await this.audit(tx, tenantId, actorUserId, 'reconciliation.policy.updated', created);

      return created;
    });
  }

  async deactivatePolicy(tenantId: string, actorUserId: string, id: string) {
    const policy = await this.prisma.reconciliationPolicy.findFirst({
      where: { id, tenantId },
    });
    if (!policy) {
      throw new NotFoundException('Reconciliation policy not found.');
    }

    const updated = await this.prisma.reconciliationPolicy.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit(
      this.prisma,
      tenantId,
      actorUserId,
      'reconciliation.policy.deactivated',
      updated,
    );

    return updated;
  }

  private async createNextVersion(
    tx: Prisma.TransactionClient,
    tenantId: string,
    data: {
      provider: ReconciliationPolicy['provider'];
      currency: string;
      currencyExponent: number;
      amountToleranceMinor: string;
      version: number;
    },
  ) {
    await tx.reconciliationPolicy.updateMany({
      where: {
        tenantId,
        provider: data.provider,
        currency: data.currency,
        isActive: true,
      },
      data: { isActive: false },
    });

    return tx.reconciliationPolicy.create({
      data: {
        tenantId,
        provider: data.provider,
        currency: data.currency,
        currencyExponent: data.currencyExponent,
        amountToleranceMinor: new Prisma.Decimal(data.amountToleranceMinor),
        version: data.version,
        isActive: true,
      },
    });
  }

  private findLatestPolicy(
    tx: Prisma.TransactionClient,
    tenantId: string,
    provider: ReconciliationPolicy['provider'],
    currency: string,
  ) {
    return tx.reconciliationPolicy.findFirst({
      where: { tenantId, provider, currency },
      orderBy: { version: 'desc' },
    });
  }

  private async audit(
    tx: Pick<PrismaService, 'auditLog'> | Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    action: string,
    policy: ReconciliationPolicy,
  ) {
    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'ReconciliationPolicy',
        entityId: policy.id,
        metadata: {
          provider: policy.provider,
          currency: policy.currency,
          version: policy.version,
          amountToleranceMinor: policy.amountToleranceMinor.toString(),
        } as Prisma.InputJsonValue,
      },
    });
  }
}
