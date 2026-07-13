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
      eventType: true,
      providerStatus: true,
      amountMinor: true,
      feeAmountMinor: true,
      netAmountMinor: true,
      currency: true,
      availableAt: true,
      occurredAt: true,
      receivedAt: true,
    },
  },
  payment: {
    select: {
      id: true,
      reference: true,
      amount: true,
      currency: true,
      status: true,
      providerPaymentId: true,
    },
  },
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
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

  async getTimeline(tenantId: string, id: string) {
    const reconciliationCase = await this.prisma.reconciliationCase.findFirst({
      where: { id, tenantId },
      include: CASE_INCLUDE,
    });

    if (!reconciliationCase) {
      throw new NotFoundException('Reconciliation case not found.');
    }

    const decisions = await this.prisma.reconciliationDecision.findMany({
      where: { tenantId, caseId: id },
      orderBy: { createdAt: 'asc' },
    });

    const normalizedDecisions = decisions.map((decision) => ({
      ...decision,
      metadata: decision.metadata ?? null,
    }));
    const events = [
      {
        type: 'SETTLEMENT_EVENT_RECEIVED',
        occurredAt:
          reconciliationCase.settlementEvent.occurredAt ??
          reconciliationCase.settlementEvent.receivedAt ??
          reconciliationCase.createdAt,
        settlementEvent: this.toSettlementEvidence(reconciliationCase.settlementEvent),
      },
      {
        type: 'CASE_CREATED',
        occurredAt: reconciliationCase.createdAt,
        case: {
          id: reconciliationCase.id,
          status: reconciliationCase.status,
          matchType: reconciliationCase.matchType,
        },
      },
      ...normalizedDecisions.map((decision) => ({
        type: 'DECISION_RECORDED',
        occurredAt: decision.createdAt,
        decision,
      })),
    ].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

    return {
      case: this.toResponse(reconciliationCase),
      evidence: {
        settlementEvent: this.toSettlementEvidence(reconciliationCase.settlementEvent),
        payment: reconciliationCase.payment ?? null,
        order: reconciliationCase.order ?? null,
      },
      decisions: normalizedDecisions,
      events,
    };
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
      differenceAmountMinor: reconciliationCase.differenceAmountMinor?.toString() ?? null,
      settlementEvent: this.toSettlementEvidence(reconciliationCase.settlementEvent),
    };
  }

  private toSettlementEvidence(
    settlementEvent: Prisma.ReconciliationCaseGetPayload<{
      include: typeof CASE_INCLUDE;
    }>['settlementEvent'],
  ) {
    return {
      ...settlementEvent,
      amountMinor: settlementEvent.amountMinor?.toString() ?? null,
      feeAmountMinor: settlementEvent.feeAmountMinor?.toString() ?? null,
      netAmountMinor: settlementEvent.netAmountMinor?.toString() ?? null,
    };
  }
}
