export class AuthenticatedPrincipal {
  userId!: string;
  email!: string;
  companyId!: string | null;
  membershipId!: string | null;
  isPlatformAdmin!: boolean;
}

export interface RequestContext {
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
  principal: AuthenticatedPrincipal | null;
}
