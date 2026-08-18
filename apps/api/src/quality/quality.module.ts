import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { QualityController } from './quality.controller';
import {
  QUALITY_INTEGRATION,
  LoggedQualityIntegration,
} from './quality-integration.port';
import { QualityService } from './quality.service';

@Module({
  imports: [AuditModule],
  controllers: [QualityController],
  providers: [
    QualityService,
    LoggedQualityIntegration,
    { provide: QUALITY_INTEGRATION, useExisting: LoggedQualityIntegration },
  ],
  exports: [QualityService],
})
export class QualityModule {}
