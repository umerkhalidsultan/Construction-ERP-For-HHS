import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OpportunityController } from './opportunity.controller';
import { OpportunityService } from './opportunity.service';

@Module({
  imports: [AuditModule],
  controllers: [OpportunityController],
  providers: [OpportunityService],
})
export class OpportunityModule {}
