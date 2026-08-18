import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WorkforceService } from './application/workforce.service';
import { WORKFORCE_SERVICE } from './application/workforce.service.interface';
import { WORKFORCE_REPOSITORY } from './domain/workforce.repository';
import { PrismaWorkforceRepository } from './infrastructure/prisma-workforce.repository';
import { WorkforceController } from './presentation/workforce.controller';

@Module({
  imports: [AuditModule],
  controllers: [WorkforceController],
  providers: [
    WorkforceService,
    PrismaWorkforceRepository,
    { provide: WORKFORCE_SERVICE, useExisting: WorkforceService },
    { provide: WORKFORCE_REPOSITORY, useExisting: PrismaWorkforceRepository },
  ],
  exports: [WORKFORCE_SERVICE],
})
export class WorkforceModule {}
