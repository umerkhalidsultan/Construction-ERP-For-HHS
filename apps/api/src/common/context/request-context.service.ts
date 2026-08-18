import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  AuthenticatedPrincipal,
  RequestContext,
} from './request-context.types';

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): RequestContext | undefined {
    return this.storage.getStore();
  }

  setPrincipal(principal: AuthenticatedPrincipal): void {
    const context = this.storage.getStore();
    if (context) {
      context.principal = principal;
    }
  }

  get principal(): AuthenticatedPrincipal | null {
    return this.storage.getStore()?.principal ?? null;
  }

  get requestId(): string | null {
    return this.storage.getStore()?.requestId ?? null;
  }

  get actorId(): string | null {
    return this.principal?.userId ?? null;
  }

  get companyId(): string | null {
    return this.principal?.companyId ?? null;
  }
}
