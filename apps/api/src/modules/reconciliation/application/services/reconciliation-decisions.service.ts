import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ReconciliationCase,
  ReconciliationCaseStatus,
  ReconciliationDecisionAction,
  ReconciliationMatchType,
} from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { CreateReconciliationDecisionDto } from '../dto/create-reconciliation-decision.dto';

@Injectable()
export class ReconciliationDecisionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDecision(
    tenantId: string,
    actorUserId: string,
    caseId: string,
    dto: CreateReconciliationDecisionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reconciliationCase = await tx.reconciliationCase.findFirst({
        where: { id: caseId, tenantId },
      });
      if (!reconciliationCase) {
        throw new NotFoundException('Reconciliation case not found.');
      }

      if (dto.action === ReconciliationDecisionAction.MANUAL_MATCH && !dto.paymentId) {
        throw new BadRequestException('paymentId is required for manual match decisions.');
      }

      const payment = dto.paymentId
        ? await tx.payment.findFirst({ where: { id: dto.paymentId, tenantId } })
        : null;
      if (dto.paymentId && !payment) {
        throw new NotFoundException('Payment not found.');
      }

      const nextStatus = this.resolveNextStatus(dto.action, reconciliationCase.status);
      const caseUpdate = this.buildCaseUpdate(reconciliationCase, dto, nextStatus);

      const decision = await tx.reconciliationDecision.create({
        data: {
          tenantId,
          caseId,
          actorUserId,
          action: dto.action,
          reasonCode: dto.reasonCode,
          comment: dto.comment,
          previousStatus: reconciliationCase.status,
          nextStatus,
          paymentId: dto.paymentId,
          metadata: dto.metadata as Prisma.InputJsonValue,
        },
      });
      const updatedCase = await tx.reconciliationCase.update({
        where: { id: caseId },
        data: caseUpdate,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId,
          action: this.auditAction(dto.action),
          entityType: 'ReconciliationCase',
          entityId: caseId,
          metadata: {
            decisionId: decision.id,
            reasonCode: dto.reasonCode,
            previousStatus: reconciliationCase.status,
            nextStatus,
            paymentId: dto.paymentId,
          },
        },
      });

      return { decision, case: updatedCase };
    });
  }

  private resolveNextStatus(
    action: ReconciliationDecisionAction,
    currentStatus: ReconciliationCaseStatus,
  ) {
    switch (action) {
      case ReconciliationDecisionAction.MANUAL_MATCH:
        return ReconciliationCaseStatus.MANUALLY_MATCHED;
      case ReconciliationDecisionAction.RESOLVE_EXCEPTION:
        return ReconciliationCaseStatus.RESOLVED_EXCEPTION;
      case ReconciliationDecisionAction.IGNORE:
        return ReconciliationCaseStatus.IGNORED;
      case ReconciliationDecisionAction.REOPEN:
        return ReconciliationCaseStatus.PENDING;
      case ReconciliationDecisionAction.COMMENT:
        return currentStatus;
    }
  }

  private buildCaseUpdate(
    reconciliationCase: ReconciliationCase,
    dto: CreateReconciliationDecisionDto,
    nextStatus: ReconciliationCaseStatus,
  ): Prisma.ReconciliationCaseUncheckedUpdateInput {
    if (dto.action === ReconciliationDecisionAction.COMMENT) {
      return { status: reconciliationCase.status };
    }
    if (dto.action === ReconciliationDecisionAction.REOPEN) {
      return {
        status: nextStatus,
        reconciledAt: null,
      };
    }
    if (dto.action === ReconciliationDecisionAction.MANUAL_MATCH) {
      return {
        status: nextStatus,
        matchType: ReconciliationMatchType.EXPLICIT_LINK,
        paymentId: dto.paymentId,
        matchedAt: new Date(),
      };
    }
    return {
      status: nextStatus,
      reconciledAt: new Date(),
    };
  }

  private auditAction(action: ReconciliationDecisionAction) {
    return `reconciliation.decision.${action.toLowerCase()}`;
  }
}
