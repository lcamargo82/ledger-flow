import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { ListReconciliationCasesQueryDto } from '../dto/list-reconciliation-cases-query.dto';

const CASE_INCLUDE = {
  settlementEvent: {
    select: {
      id: true,
      providerEventId: true,
      providerPaymentId: true,
      externalReference: true,
      occurredAt: true,
    },
  },
  payment: {
    select: {
      id: true,
      reference: true,
      amount: true,
      currency: true,
      providerPaymentId: true,
    },
  },
} satisfies Prisma.ReconciliationCaseInclude;

@Injectable()
export class ReconciliationCasesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCases(tenantId: string, query: ListReconciliationCasesQueryDto) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 20, 100);
    const where = this.buildWhere(tenantId, query);

    const [cases, total] = await Promise.all([
      this.prisma.reconciliationCase.findMany({
        where,
        include: CASE_INCLUDE,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reconciliationCase.count({ where }),
    ]);

    return {
      data: cases.map((reconciliationCase) => this.toResponse(reconciliationCase)),
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  async getCase(tenantId: string, id: string) {
    const reconciliationCase = await this.prisma.reconciliationCase.findFirst({
      where: { id, tenantId },
      include: CASE_INCLUDE,
    });

    if (!reconciliationCase) {
      throw new NotFoundException('Reconciliation case not found.');
    }

    return this.toResponse(reconciliationCase);
  }

  private buildWhere(
    tenantId: string,
    query: ListReconciliationCasesQueryDto,
  ): Prisma.ReconciliationCaseWhereInput {
    return {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.provider && { provider: query.provider }),
      ...(query.matchType && { matchType: query.matchType }),
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
    };
  }

  private toResponse(
    reconciliationCase: Prisma.ReconciliationCaseGetPayload<{
      include: typeof CASE_INCLUDE;
    }>,
  ) {
    return {
      ...reconciliationCase,
      expectedAmountMinor: reconciliationCase.expectedAmountMinor?.toString() ?? null,
      receivedAmountMinor: reconciliationCase.receivedAmountMinor?.toString() ?? null,
      differenceAmountMinor:
        reconciliationCase.differenceAmountMinor?.toString() ?? null,
    };
  }
}
