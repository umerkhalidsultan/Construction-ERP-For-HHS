import { UnprocessableEntityException } from '@nestjs/common';
import { TenderStatus } from '@prisma/client';

export const TERMINAL_TENDER_STATUSES = new Set<TenderStatus>([
  TenderStatus.NO_BID,
  TenderStatus.AWARDED,
  TenderStatus.LOST,
  TenderStatus.CANCELLED,
]);

const transitions: Record<TenderStatus, readonly TenderStatus[]> = {
  DRAFT: [TenderStatus.REGISTERED, TenderStatus.CANCELLED],
  REGISTERED: [TenderStatus.UNDER_REVIEW, TenderStatus.CANCELLED],
  UNDER_REVIEW: [TenderStatus.BID_DECISION_PENDING, TenderStatus.CANCELLED],
  BID_DECISION_PENDING: [
    TenderStatus.BID_APPROVED,
    TenderStatus.NO_BID,
    TenderStatus.CANCELLED,
  ],
  BID_APPROVED: [TenderStatus.PREPARING, TenderStatus.CANCELLED],
  NO_BID: [],
  PREPARING: [TenderStatus.READY_FOR_SUBMISSION, TenderStatus.CANCELLED],
  READY_FOR_SUBMISSION: [
    TenderStatus.SUBMITTED,
    TenderStatus.PREPARING,
    TenderStatus.CANCELLED,
  ],
  SUBMITTED: [
    TenderStatus.CLARIFICATION,
    TenderStatus.TECHNICAL_EVALUATION,
    TenderStatus.COMMERCIAL_EVALUATION,
    TenderStatus.NEGOTIATION,
    TenderStatus.AWARDED,
    TenderStatus.LOST,
    TenderStatus.CANCELLED,
  ],
  CLARIFICATION: [
    TenderStatus.TECHNICAL_EVALUATION,
    TenderStatus.COMMERCIAL_EVALUATION,
    TenderStatus.NEGOTIATION,
    TenderStatus.AWARDED,
    TenderStatus.LOST,
    TenderStatus.CANCELLED,
  ],
  TECHNICAL_EVALUATION: [
    TenderStatus.COMMERCIAL_EVALUATION,
    TenderStatus.NEGOTIATION,
    TenderStatus.AWARDED,
    TenderStatus.LOST,
    TenderStatus.CANCELLED,
  ],
  COMMERCIAL_EVALUATION: [
    TenderStatus.NEGOTIATION,
    TenderStatus.AWARDED,
    TenderStatus.LOST,
    TenderStatus.CANCELLED,
  ],
  NEGOTIATION: [
    TenderStatus.AWARDED,
    TenderStatus.LOST,
    TenderStatus.CANCELLED,
  ],
  AWARDED: [],
  LOST: [],
  CANCELLED: [],
};

export function assertTenderTransition(
  from: TenderStatus,
  to: TenderStatus,
): void {
  if (!transitions[from].includes(to)) {
    throw new UnprocessableEntityException(
      'This Tender cannot move to the requested status.',
    );
  }
}
