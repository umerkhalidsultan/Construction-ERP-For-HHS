import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { CrmDashboardController } from './dashboard.controller';
import { CrmDashboardService } from './dashboard.service';
import { CrmController } from './crm.controller';
import { LeadService } from './lead.service';
import { PartyController } from './party.controller';
import { PartyService } from './party.service';

@Module({
  imports: [AuditModule],
  controllers: [
    CrmController,
    PartyController,
    ActivityController,
    CrmDashboardController,
  ],
  providers: [LeadService, PartyService, ActivityService, CrmDashboardService],
})
export class CrmModule {}
