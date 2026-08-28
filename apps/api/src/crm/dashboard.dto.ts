import { OpportunityPriority } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  Max,
  Min,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Requested visibility scope. The server clamps this to the highest scope the
 * caller's permissions actually allow — it is a request, never an authority.
 */
export const DashboardScope = {
  OWN: 'own',
  TEAM: 'team',
  ALL: 'all',
} as const;
export type DashboardScope =
  (typeof DashboardScope)[keyof typeof DashboardScope];

export class CrmDashboardQueryDto {
  @IsOptional()
  @IsIn(['own', 'team', 'all'])
  scope?: DashboardScope;

  /** Period start (inclusive) for period metrics such as "Won this month". */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Period end (inclusive). */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  leadSourceId?: string;

  @IsOptional()
  @IsUUID()
  opportunityTypeId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsEnum(OpportunityPriority)
  priority?: OpportunityPriority;

  @IsOptional()
  @IsUUID()
  crmCompanyId?: string;

  /**
   * Restricts monetary aggregates to a single currency. When omitted, money is
   * returned grouped by currency so unrelated currencies are never summed.
   */
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'Use a three-letter currency code.' })
  currency?: string;

  /** Days without a CRM activity before an open opportunity is considered stale. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  staleDays?: number;
}
