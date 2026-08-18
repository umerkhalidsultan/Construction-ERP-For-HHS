import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const QUALITY_INTEGRATION = Symbol('QUALITY_INTEGRATION');

export interface QualityIntegrationEvent {
  name: string;
  companyId: string;
  projectId: string;
  entityId: string;
  actorId: string;
  payload?: Record<string, unknown>;
}

export interface QualityIntegrationPort {
  publish(event: QualityIntegrationEvent): Promise<void>;
  notify(event: QualityIntegrationEvent): Promise<void>;
}

/** Integration seam until the repository's placeholder NotificationsModule and
 * missing event bus are backed by real infrastructure. */
@Injectable()
export class LoggedQualityIntegration implements QualityIntegrationPort {
  private readonly logger = new Logger('QualityIntegration');
  constructor(private readonly prisma: PrismaService) {}

  async publish(event: QualityIntegrationEvent): Promise<void> {
    if (!event.projectId) {
      this.logger.log(JSON.stringify({ kind: 'quality-event', ...event }));
      return;
    }
    await this.prisma.qualityOutboxEvent.create({
      data: {
        companyId: event.companyId,
        projectId: event.projectId,
        eventName: event.name,
        entityId: event.entityId,
        actorId: event.actorId,
        payload: (event.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async notify(event: QualityIntegrationEvent): Promise<void> {
    if (!event.projectId) return;
    await this.prisma.qualityOutboxEvent.create({
      data: {
        companyId: event.companyId,
        projectId: event.projectId,
        eventName: `NotificationRequested:${event.name}`,
        entityId: event.entityId,
        actorId: event.actorId,
        payload: (event.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
