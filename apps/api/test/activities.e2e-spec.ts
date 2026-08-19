/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ValidationAppError } from '../src/common/errors/app-errors';
import { mapValidationErrors } from '../src/common/errors/validation-error.mapper';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ActivityController } from '../src/crm/activity.controller';
import { ActivityService } from '../src/crm/activity.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('CRM Activities API (HTTP integration)', () => {
  let app: INestApplication<App>;
  const companyId = '11111111-1111-4111-8111-111111111111';
  const activityId = '22222222-2222-4222-8222-222222222222';
  const activities = {
    list: jest.fn().mockResolvedValue({
      data: [{ id: activityId, subject: 'Call client' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assign: jest.fn(),
    complete: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
    dashboard: jest.fn().mockResolvedValue({
      today: { total: 0, byType: [] },
      overdue: 0,
      completedThisWeek: 0,
      pendingFollowUps: 0,
    }),
    team: jest.fn().mockResolvedValue([]),
    calendar: jest.fn().mockResolvedValue([]),
    catalog: jest.fn().mockReturnValue({
      types: ['CALL', 'MEETING'],
      statuses: ['PLANNED', 'COMPLETED'],
      priorities: ['LOW', 'MEDIUM'],
      relatedTypes: ['LEAD', 'OPPORTUNITY'],
    }),
    assignees: jest.fn().mockResolvedValue([]),
    exportCsv: jest
      .fn()
      .mockResolvedValue('"Type","Subject"\r\n"CALL","Call client"'),
    timeline: jest.fn().mockResolvedValue([]),
    addAttachment: jest.fn(),
    deleteAttachment: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [{ provide: ActivityService, useValue: activities }],
    }).compile();
    app = module.createNestApplication();
    app.use(
      (
        req: Request & { user?: unknown },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = {
          userId: '33333333-3333-4333-8333-333333333333',
          email: 'sales@example.com',
          companyId,
          membershipId: '44444444-4444-4444-8444-444444444444',
          isPlatformAdmin: false,
        };
        next();
      },
    );
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) =>
          new ValidationAppError(mapValidationErrors(errors)),
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });
  afterAll(async () => app.close());

  it('returns a server-paginated tenant activity list', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/activities?search=client`)
      .expect(200);
    expect(response.body).toMatchObject({
      status: 'success',
      data: [{ subject: 'Call client' }],
      pagination: { total: 1 },
    });
    expect(activities.list).toHaveBeenCalledWith(
      companyId,
      expect.objectContaining({ search: 'client' }),
      expect.objectContaining({ companyId }),
    );
  });

  it('resolves dashboard/team/calendar/catalog before the dynamic id route', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/activities/dashboard`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/activities/team`)
      .expect(200);
    await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/crm/activities/calendar?from=2026-08-01&to=2026-08-31`,
      )
      .expect(200);
    const catalog = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/activities/catalog`)
      .expect(200);
    expect(catalog.body.data.types).toContain('CALL');
    expect(activities.dashboard).toHaveBeenCalled();
    expect(activities.team).toHaveBeenCalled();
    expect(activities.calendar).toHaveBeenCalled();
  });

  it('rejects missing required fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/activities`)
      .send({ description: 'Missing everything required' })
      .expect(400);
    expect(response.body).toMatchObject({
      status: 'error',
      success: false,
      code: 'VALIDATION_ERROR',
    });
    expect(response.body.message).not.toMatch(/Prisma|SQL|stack/i);
    expect(activities.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid activity type', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/activities`)
      .send({
        relatedType: 'LEAD',
        leadId: '55555555-5555-4555-8555-555555555555',
        type: 'NOT_A_TYPE',
        subject: 'Call client',
        assignedToId: '66666666-6666-4666-8666-666666666666',
      })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(activities.create).not.toHaveBeenCalled();
  });

  it('rejects unknown properties on create (mass assignment protection)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/activities`)
      .send({
        relatedType: 'LEAD',
        leadId: '55555555-5555-4555-8555-555555555555',
        type: 'CALL',
        subject: 'Call client',
        assignedToId: '66666666-6666-4666-8666-666666666666',
        companyId: '77777777-7777-4777-8777-777777777777',
        status: 'COMPLETED',
      })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(activities.create).not.toHaveBeenCalled();
  });

  it('accepts a well-formed create request', async () => {
    activities.create.mockResolvedValueOnce({
      id: activityId,
      subject: 'Call client',
    });
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/activities`)
      .send({
        relatedType: 'LEAD',
        leadId: '55555555-5555-4555-8555-555555555555',
        type: 'CALL',
        subject: 'Call client',
        assignedToId: '66666666-6666-4666-8666-666666666666',
      })
      .expect(201);
    expect(response.body.data).toMatchObject({ subject: 'Call client' });
  });

  it('requires an assignedToId on assignment', async () => {
    const response = await request(app.getHttpServer())
      .patch(
        `/api/v1/companies/${companyId}/crm/activities/${activityId}/assign`,
      )
      .send({})
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(activities.assign).not.toHaveBeenCalled();
  });

  it('requires a reason when rescheduling', async () => {
    const response = await request(app.getHttpServer())
      .patch(
        `/api/v1/companies/${companyId}/crm/activities/${activityId}/reschedule`,
      )
      .send({ dueDate: '2026-08-30' })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(activities.reschedule).not.toHaveBeenCalled();
  });

  it('exports a CSV attachment', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/activities/export`)
      .expect(200)
      .expect('Content-Type', /text\/csv/);
    expect(response.text).toContain('Call client');
    expect(response.headers['content-disposition']).toContain(
      'crm-activities.csv',
    );
  });

  it('exposes the timeline sub-resource', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/crm/activities/${activityId}/timeline`,
      )
      .expect(200);
    expect(activities.timeline).toHaveBeenCalled();
  });
});
