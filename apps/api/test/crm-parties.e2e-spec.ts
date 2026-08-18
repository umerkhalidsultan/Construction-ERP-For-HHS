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
import { PartyController } from '../src/crm/party.controller';
import { PartyService } from '../src/crm/party.service';

describe('CRM companies and contacts API', () => {
  let app: INestApplication<App>;
  const companyId = '11111111-1111-4111-8111-111111111111';
  const parties = {
    listCompanies: jest.fn().mockResolvedValue({
      data: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'ABC Developers',
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }),
    listContacts: jest.fn().mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    }),
    createCompany: jest.fn(),
    createContact: jest.fn(),
    catalog: jest.fn(),
    assignees: jest.fn(),
    companyDuplicateCheck: jest.fn(),
    contactDuplicateCheck: jest.fn(),
    getCompany: jest.fn(),
    updateCompany: jest.fn(),
    deleteCompany: jest.fn(),
    assignCompany: jest.fn(),
    setPrimaryContact: jest.fn(),
    addCompanyNote: jest.fn(),
    addCompanyAttachment: jest.fn(),
    timeline: jest.fn(),
    getContact: jest.fn(),
    updateContact: jest.fn(),
    deleteContact: jest.fn(),
    assignContact: jest.fn(),
    linkContact: jest.fn(),
    addContactNote: jest.fn(),
    addContactAttachment: jest.fn(),
    linkLead: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PartyController],
      providers: [{ provide: PartyService, useValue: parties }],
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
          email: 'crm@example.com',
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
  it('returns a paginated CRM company register', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/companies?search=ABC`)
      .expect(200);
    expect(response.body).toMatchObject({
      data: [{ name: 'ABC Developers' }],
      pagination: { total: 1 },
    });
  });
  it('returns an independent-contact register', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/companies/${companyId}/crm/contacts`)
      .expect(200);
    expect(response.body.data).toEqual([]);
  });
  it('rejects invalid company input through global validation', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/companies`)
      .send({ name: '', email: 'bad' })
      .expect(400);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'VALIDATION_ERROR',
    });
    expect(response.body.message).not.toMatch(/Prisma|SQL|stack/i);
    expect(parties.createCompany).not.toHaveBeenCalled();
  });
  it('rejects mass-assigned tenant fields', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/companies/${companyId}/crm/contacts`)
      .send({
        firstName: 'Ahmed',
        companyId: '55555555-5555-4555-8555-555555555555',
      })
      .expect(400);
    expect(parties.createContact).not.toHaveBeenCalled();
  });
});
