import type { ArgumentsHost } from '@nestjs/common';
import { ValidationAppError } from '../errors/app-errors';
import type {
  ErrorMonitor,
  ErrorMonitoringEvent,
} from '../errors/error-monitor';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  function setup() {
    const events: ErrorMonitoringEvent[] = [];
    const monitor: ErrorMonitor = { capture: (event) => events.push(event) };
    let capturedBody: unknown;
    const json = jest.fn((body: unknown) => {
      capturedBody = body;
    });
    const status = jest.fn(() => ({ json }));
    const request = {
      headers: { 'x-request-id': 'req-123456789' },
      originalUrl: '/api/v1/projects',
      url: '/api/v1/projects',
      method: 'POST',
      user: { userId: 'user-1', companyId: 'company-1' },
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    return {
      filter: new GlobalExceptionFilter(monitor),
      host,
      status,
      json,
      events,
      capturedBody: () => capturedBody,
    };
  }

  it('returns the canonical nested contract and field errors', () => {
    const context = setup();
    context.filter.catch(
      new ValidationAppError({ projectName: 'Enter a project name.' }),
      context.host,
    );

    expect(context.status).toHaveBeenCalledWith(400);
    expect(context.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'VALIDATION_ERROR',
        requestId: 'req-123456789',
        fields: { projectName: 'Enter a project name.' },
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please correct the highlighted fields.',
          fields: { projectName: 'Enter a project name.' },
          requestId: 'req-123456789',
        },
      }),
    );
  });

  it('never returns internal exception details and captures diagnostics', () => {
    const context = setup();
    context.filter.catch(
      new Error('Prisma query failed: password=super-secret'),
      context.host,
    );

    expect(context.status).toHaveBeenCalledWith(500);
    const body = context.capturedBody() as {
      message: string;
      error: { message: string };
    };
    expect(body.message).toContain('Reference: REQ-1234');
    expect(body.error.message).toBe(body.message);
    expect(JSON.stringify(body)).not.toMatch(/Prisma|super-secret/);
    expect(context.events[0]).toEqual(
      expect.objectContaining({
        requestId: 'req-123456789',
        module: 'projects',
        technicalMessage: 'Prisma query failed: password=super-secret',
      }),
    );
  });
});
