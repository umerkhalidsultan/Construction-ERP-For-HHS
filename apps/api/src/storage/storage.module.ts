import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { R2StorageService } from './r2-storage.service';
import { STORAGE_SERVICE } from './storage.interface';

@Module({
  imports: [AuditModule],
  providers: [
    R2StorageService,
    { provide: STORAGE_SERVICE, useExisting: R2StorageService },
  ],
  exports: [R2StorageService, STORAGE_SERVICE],
})
export class StorageModule {}
