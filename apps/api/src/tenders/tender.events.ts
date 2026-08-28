export type TenderDomainEvent =
  | { name: 'TenderCreated'; tenderId: string; companyId: string }
  | {
      name: 'TenderAssigned';
      tenderId: string;
      companyId: string;
      membershipId: string;
    }
  | {
      name: 'BidDecisionRecorded';
      tenderId: string;
      companyId: string;
      decision: 'BID' | 'NO_BID';
    }
  | {
      name: 'TenderRequirementCompleted';
      tenderId: string;
      companyId: string;
      requirementId: string;
    }
  | { name: 'TenderSubmitted'; tenderId: string; companyId: string }
  | { name: 'TenderAwarded'; tenderId: string; companyId: string }
  | { name: 'TenderLost'; tenderId: string; companyId: string };

// Integration seam only. Workflow and notification subscribers will be added by their platform modules.
export const TENDER_DOMAIN_EVENT = Symbol('TENDER_DOMAIN_EVENT');
