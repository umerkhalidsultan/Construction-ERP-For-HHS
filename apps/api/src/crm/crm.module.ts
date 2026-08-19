import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { CrmController } from './crm.controller';
import { LeadService } from './lead.service';
import { PartyController } from './party.controller';
import { PartyService } from './party.service';

@Module({
  imports: [AuditModule],
  controllers: [CrmController, PartyController, ActivityController],
  providers: [LeadService, PartyService, ActivityService],
})
export class CrmModule {}
