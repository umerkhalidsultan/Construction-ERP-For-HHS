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
import { CrmController } from '../src/crm/crm.controller';
import { LeadService } from '../src/crm/lead.service';

describe('CRM Leads API (HTTP integration)', () => {
  let app: INestApplication<App>;
  const companyId = '11111111-1111-4111-8111-111111111111';
  const leadId = '22222222-2222-4222-8222-222222222222';
  const leads = {
    list: jest.fn().mockResolvedValue({
      data: [{ id: leadId, leadNumber: 'LEAD-2026-000001' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }),
    dashboard: jest.fn().mockResolvedValue({
      total: 1,
      byStatus: { NEW: 1 },
      expectedPipelineValue: '1000',
    }),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    catalog: jest.fn(),
    assignees: jest.fn(),
    duplicateCheck: jest.fn(),
    assign: jest.fn(),
    changeStatus: jest.fn(),
    addNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    addAttachment: jest.fn(),
    timeline: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [{ provide: LeadService, useValue: leads }],
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

  it('returns a server-paginated tenant lead register', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/leads?search=tower&page=1`)
      .expect(200);
    expect(response.body).toMatchObject({
      status: 'success',
      data: [{ leadNumber: 'LEAD-2026-000001' }],
      pagination: { total: 1, totalPages: 1 },
    });
    expect(leads.list).toHaveBeenCalledWith(
      companyId,
      expect.objectContaining({ search: 'tower', page: 1 }),
      expect.objectContaining({ companyId }),
    );
  });

  it('resolves dashboard before the dynamic lead route', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/leads/dashboard`)
      .expect(200);
    expect(response.body.data).toMatchObject({
      total: 1,
      byStatus: { NEW: 1 },
    });
  });

  it('uses global validation and never calls service for invalid lead input', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/leads`)
      .send({ name: '', email: 'invalid' })
      .expect(400);
    expect(response.body).toMatchObject({
      status: 'error',
      success: false,
      code: 'VALIDATION_ERROR',
    });
    expect(response.body.message).not.toMatch(/Prisma|SQL|stack/i);
    expect(leads.create).not.toHaveBeenCalled();
  });
});
