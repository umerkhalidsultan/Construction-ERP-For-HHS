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
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { OpportunityController } from '../src/opportunities/opportunity.controller';
import { OpportunityService } from '../src/opportunities/opportunity.service';

describe('CRM Opportunities API (HTTP integration)', () => {
  let app: INestApplication<App>;
  const companyId = '11111111-1111-4111-8111-111111111111';
  const opportunityId = '22222222-2222-4222-8222-222222222222';
  const opportunities = {
    list: jest.fn().mockResolvedValue({
      data: [{ id: opportunityId, opportunityNumber: 'OPP-2026-000001' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    dashboard: jest.fn().mockResolvedValue({
      byStatus: { OPEN: 1, WON: 0, LOST: 0 },
      pipelineValue: '1000',
      weightedPipeline: '300',
    }),
    pipeline: jest.fn().mockResolvedValue({
      byStage: [],
      totals: { count: 0, totalValue: '0', weightedValue: '0' },
    }),
    forecast: jest.fn().mockResolvedValue({
      month: '2026-08',
      pipeline: { count: 1, value: '1000', weighted: '300' },
    }),
    exportCsv: jest
      .fn()
      .mockResolvedValue('"Number","Name"\r\n"OPP-2026-000001","Tower"'),
    catalog: jest
      .fn()
      .mockResolvedValue({ stages: [], types: [], sources: [] }),
    assignees: jest.fn(),
    convertPreview: jest.fn(),
    convertLead: jest.fn(),
    assign: jest.fn(),
    changeStage: jest.fn(),
    markWon: jest.fn(),
    markLost: jest.fn(),
    reopen: jest.fn(),
    addNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    addAttachment: jest.fn(),
    deleteAttachment: jest.fn(),
    timeline: jest.fn(),
    stageHistory: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OpportunityController],
      providers: [{ provide: OpportunityService, useValue: opportunities }],
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

  it('returns a server-paginated tenant opportunity register', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/crm/opportunities?search=tower&page=2`,
      )
      .expect(200);
    expect(response.body).toMatchObject({
      status: 'success',
      data: [{ opportunityNumber: 'OPP-2026-000001' }],
      pagination: { total: 1, totalPages: 1 },
    });
    expect(opportunities.list).toHaveBeenCalledWith(
      companyId,
      expect.objectContaining({ search: 'tower', page: 2 }),
      expect.objectContaining({ companyId }),
    );
  });

  it('resolves pipeline and forecast routes before the dynamic id route', async () => {
    const pipeline = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/opportunities/pipeline`)
      .expect(200);
    expect(pipeline.body.data).toMatchObject({ totals: { count: 0 } });
    const forecast = await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/crm/opportunities/forecast?month=2026-08`,
      )
      .expect(200);
    expect(forecast.body.data).toMatchObject({
      month: '2026-08',
      pipeline: { count: 1 },
    });
  });

  it('rejects an invalid forecast month format', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/crm/opportunities/forecast?month=2026-13`,
      )
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(response.body.message).not.toMatch(/Prisma|SQL|stack/i);
  });

  it('uses global validation and never calls service for invalid input', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/opportunities`)
      .send({ name: '', opportunityTypeId: 'not-a-uuid', sourceId: 'x' })
      .expect(400);
    expect(response.body).toMatchObject({
      status: 'error',
      success: false,
      code: 'VALIDATION_ERROR',
    });
    expect(response.body.message).not.toMatch(/Prisma|SQL|stack/i);
    expect(opportunities.create).not.toHaveBeenCalled();
  });

  it('rejects unknown properties on create (mass assignment protection)', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/opportunities`)
      .send({
        name: 'Valid opportunity',
        opportunityTypeId: '66666666-6666-4666-8666-666666666666',
        sourceId: '77777777-7777-4777-8777-777777777777',
        companyId: '88888888-8888-4888-8888-888888888888',
        opportunityNumber: 'OPP-FORGED-000001',
      })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(opportunities.create).not.toHaveBeenCalled();
  });

  it('validates probability bounds on create', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/opportunities`)
      .send({
        name: 'Valid opportunity',
        opportunityTypeId: '66666666-6666-4666-8666-666666666666',
        sourceId: '77777777-7777-4777-8777-777777777777',
        probability: 150,
      })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(opportunities.create).not.toHaveBeenCalled();
  });

  it('requires a stage id when changing stage', async () => {
    const response = await request(app.getHttpServer())
      .patch(
        `/api/v1/companies/${companyId}/crm/opportunities/${opportunityId}/stage`,
      )
      .send({ reason: 'Kanban drag' })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(opportunities.changeStage).not.toHaveBeenCalled();
  });

  it('validates the won workflow payload', async () => {
    const response = await request(app.getHttpServer())
      .patch(
        `/api/v1/companies/${companyId}/crm/opportunities/${opportunityId}/won`,
      )
      .send({ wonDate: 'not-a-date' })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(opportunities.markWon).not.toHaveBeenCalled();
  });

  it('validates the lost workflow payload', async () => {
    const response = await request(app.getHttpServer())
      .patch(
        `/api/v1/companies/${companyId}/crm/opportunities/${opportunityId}/lost`,
      )
      .send({ lostReasonId: '99999999-9999-4999-8999-999999999999' })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(opportunities.markLost).not.toHaveBeenCalled();
  });

  it('requires a reason when reopening an opportunity', async () => {
    const response = await request(app.getHttpServer())
      .patch(
        `/api/v1/companies/${companyId}/crm/opportunities/${opportunityId}/reopen`,
      )
      .send({})
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(opportunities.reopen).not.toHaveBeenCalled();
  });

  it('validates the lead conversion payload', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/opportunities/convert`)
      .send({ leadId: 'not-a-uuid' })
      .expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(opportunities.convertLead).not.toHaveBeenCalled();
  });

  it('exports a CSV attachment', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/opportunities/export`)
      .expect(200)
      .expect('Content-Type', /text\/csv/);
    expect(response.text).toContain('OPP-2026-000001');
    expect(response.headers['content-disposition']).toContain(
      'opportunities.csv',
    );
  });

  it('exposes stage-history and timeline sub-resources', async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/crm/opportunities/${opportunityId}/stage-history`,
      )
      .expect(200);
    await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/crm/opportunities/${opportunityId}/timeline`,
      )
      .expect(200);
    expect(opportunities.stageHistory).toHaveBeenCalled();
    expect(opportunities.timeline).toHaveBeenCalled();
  });
});
