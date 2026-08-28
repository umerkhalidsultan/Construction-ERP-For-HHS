import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CompaniesModule } from '../companies/companies.module';
import { TenderController } from './tender.controller';
import { TenderService } from './tender.service';

@Module({
  imports: [AuditModule, CompaniesModule],
  controllers: [TenderController],
  providers: [TenderService],
  exports: [TenderService],
})
export class TenderModule {}
