import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ??
      randomUUID();

    const normalizedException = this.normalizePrismaException(exception);

    const status =
      normalizedException instanceof HttpException
        ? normalizedException.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      normalizedException instanceof HttpException
        ? normalizedException.getResponse()
        : { message: 'Internal server error' };

    const message = this.extractMessage(exceptionResponse);

    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} - Status: ${status} - Error: ${JSON.stringify(message)}`,
      normalizedException instanceof Error ? normalizedException.stack : '',
    );

    response.status(status).json({
      status: 'error',
      message: Array.isArray(message) ? message[0] : message,
      data: null,
      errors: Array.isArray(message) ? message : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  private normalizePrismaException(exception: unknown): unknown {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return new ConflictException(
          'A record with the same unique value exists',
        );
      }
      if (exception.code === 'P2025') {
        return new NotFoundException('The requested record was not found');
      }
    }
    return exception;
  }

  private extractMessage(response: string | object): string | string[] {
    if (typeof response === 'string') {
      return response;
    }
    if ('message' in response) {
      const message = (response as { message?: unknown }).message;
      if (
        typeof message === 'string' ||
        (Array.isArray(message) &&
          message.every((item) => typeof item === 'string'))
      ) {
        return message;
      }
    }
    return 'Request failed';
  }
}
