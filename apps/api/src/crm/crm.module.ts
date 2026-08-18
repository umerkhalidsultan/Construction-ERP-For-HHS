import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CrmController } from './crm.controller';
import { LeadService } from './lead.service';
import { PartyController } from './party.controller';
import { PartyService } from './party.service';

@Module({
  imports: [AuditModule],
  controllers: [CrmController, PartyController],
  providers: [LeadService, PartyService],
})
export class CrmModule {}
