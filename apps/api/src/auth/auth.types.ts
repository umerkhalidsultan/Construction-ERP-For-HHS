export interface AccessTokenPayload {
  sub: string;
  email: string;
  companyId: string | null;
  membershipId: string | null;
  isPlatformAdmin: boolean;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}

export interface ClientMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}
