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
import { WORKFORCE_SERVICE } from '../src/workforce/application/workforce.service.interface';
import { WorkforceController } from '../src/workforce/presentation/workforce.controller';

describe('Workforce API (HTTP integration)', () => {
  let app: INestApplication<App>;
  const companyId = '11111111-1111-4111-8111-111111111111';
  const service = {
    list: jest.fn().mockResolvedValue({
      items: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          employeeCode: 'EMP-001',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      pages: 1,
    }),
    create: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WorkforceController],
      providers: [{ provide: WORKFORCE_SERVICE, useValue: service }],
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
          email: 'hr@example.com',
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
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns the paginated employee directory envelope', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/workforce/employees?limit=10`)
      .expect(200);
    const body: unknown = response.body;
    expect(body).toMatchObject({
      status: 'success',
      data: [{ employeeCode: 'EMP-001' }],
      pagination: { total: 1, totalPages: 1 },
    });
  });

  it('rejects an invalid employee payload before reaching the service', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/workforce/employees`)
      .send({ employeeCode: '!', firstName: '', joiningDate: 'bad' })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });
});
