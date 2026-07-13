import { ReconciliationDecisionAction } from '@prisma/client';

export interface ReconciliationReasonCode {
  code: string;
  action: ReconciliationDecisionAction;
  labelKey: string;
  requiresComment: boolean;
}

export const RECONCILIATION_REASON_CODES: ReconciliationReasonCode[] = [
  {
    code: 'OPERATIONAL_NOTE',
    action: ReconciliationDecisionAction.COMMENT,
    labelKey: 'reconciliation.reasonCodes.OPERATIONAL_NOTE',
    requiresComment: false,
  },
  {
    code: 'WAITING_PROVIDER_CONFIRMATION',
    action: ReconciliationDecisionAction.COMMENT,
    labelKey: 'reconciliation.reasonCodes.WAITING_PROVIDER_CONFIRMATION',
    requiresComment: true,
  },
  {
    code: 'MANUAL_PAYMENT_CONFIRMED',
    action: ReconciliationDecisionAction.MANUAL_MATCH,
    labelKey: 'reconciliation.reasonCodes.MANUAL_PAYMENT_CONFIRMED',
    requiresComment: false,
  },
  {
    code: 'MARKETPLACE_ORDER_CONFIRMED',
    action: ReconciliationDecisionAction.MANUAL_MATCH,
    labelKey: 'reconciliation.reasonCodes.MARKETPLACE_ORDER_CONFIRMED',
    requiresComment: false,
  },
  {
    code: 'AMOUNT_TOLERANCE_ACCEPTED',
    action: ReconciliationDecisionAction.RESOLVE_EXCEPTION,
    labelKey: 'reconciliation.reasonCodes.AMOUNT_TOLERANCE_ACCEPTED',
    requiresComment: false,
  },
  {
    code: 'PROVIDER_FEE_EXPLAINED',
    action: ReconciliationDecisionAction.RESOLVE_EXCEPTION,
    labelKey: 'reconciliation.reasonCodes.PROVIDER_FEE_EXPLAINED',
    requiresComment: true,
  },
  {
    code: 'DUPLICATE_PROVIDER_EVENT',
    action: ReconciliationDecisionAction.IGNORE,
    labelKey: 'reconciliation.reasonCodes.DUPLICATE_PROVIDER_EVENT',
    requiresComment: false,
  },
  {
    code: 'PROVIDER_NOISE',
    action: ReconciliationDecisionAction.IGNORE,
    labelKey: 'reconciliation.reasonCodes.PROVIDER_NOISE',
    requiresComment: true,
  },
  {
    code: 'REOPEN_FOR_NEW_EVIDENCE',
    action: ReconciliationDecisionAction.REOPEN,
    labelKey: 'reconciliation.reasonCodes.REOPEN_FOR_NEW_EVIDENCE',
    requiresComment: true,
  },
];

export function findReconciliationReasonCode(
  action: ReconciliationDecisionAction,
  code: string,
): ReconciliationReasonCode | undefined {
  return RECONCILIATION_REASON_CODES.find(
    (reasonCode) => reasonCode.action === action && reasonCode.code === code,
  );
}
