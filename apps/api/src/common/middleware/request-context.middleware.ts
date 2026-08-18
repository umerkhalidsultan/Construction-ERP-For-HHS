import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const inboundRequestId = request.header('x-request-id');
    const requestId =
      inboundRequestId && inboundRequestId.length <= 100
        ? inboundRequestId
        : randomUUID();

    response.setHeader('x-request-id', requestId);

    this.context.run(
      {
        requestId,
        ipAddress: request.ip || request.socket.remoteAddress || null,
        userAgent: request.header('user-agent') ?? null,
        principal: null,
      },
      next,
    );
  }
}
