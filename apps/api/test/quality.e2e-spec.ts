import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { QualityController } from '../src/quality/quality.controller';
import { QualityService } from '../src/quality/quality.service';

describe('Quality API (HTTP integration)', () => {
  let app: INestApplication<App>;
  const companyId = '11111111-1111-4111-8111-111111111111';
  const projectId = '22222222-2222-4222-8222-222222222222';
  const quality = {
    dashboard: jest.fn().mockResolvedValue({
      inspectionCount: 12,
      inspectionPassRate: 91.67,
      openNcrs: 2,
    }),
    listInspections: jest.fn().mockResolvedValue({
      items: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          inspectionNumber: 'IR-001',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    }),
    createInspection: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [QualityController],
      providers: [{ provide: QualityService, useValue: quality }],
    }).compile();
    app = module.createNestApplication();
    app.use(
      (
        req: Request & { user?: unknown },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = {
          userId: '44444444-4444-4444-8444-444444444444',
          email: 'qa@example.com',
          companyId,
          membershipId: '55555555-5555-4555-8555-555555555555',
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
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns the project quality KPI dashboard', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/projects/${projectId}/quality/dashboard`,
      )
      .expect(200);
    expect(response.body).toMatchObject({
      status: 'success',
      data: { inspectionCount: 12, openNcrs: 2 },
    });
  });

  it('returns a paginated inspection register', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v1/companies/${companyId}/projects/${projectId}/quality/inspections`,
      )
      .expect(200);
    expect(response.body).toMatchObject({
      data: [{ inspectionNumber: 'IR-001' }],
      pagination: { total: 1, totalPages: 1 },
    });
  });

  it('rejects an invalid inspection before service execution', async () => {
    await request(app.getHttpServer())
      .post(
        `/api/v1/companies/${companyId}/projects/${projectId}/quality/inspections`,
      )
      .send({ inspectionNumber: '', requestedDate: 'bad', description: '' })
      .expect(400);
    expect(quality.createInspection).not.toHaveBeenCalled();
  });
});
