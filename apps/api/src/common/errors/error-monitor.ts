import { Logger } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export interface ErrorMonitoringEvent {
  requestId: string;
  timestamp: string;
  endpoint: string;
  method: string;
  module: string;
  status: number;
  code: ErrorCode;
  userId: string | null;
  companyId: string | null;
  environment: string;
  technicalMessage: string;
  stack?: string;
}

export interface ErrorMonitor {
  capture(event: ErrorMonitoringEvent): void;
}

const SECRET_PATTERN =
  /(authorization|access[_-]?token|refresh[_-]?token|password|secret|api[_-]?key)(\s*[:=]\s*)([^\s,;]+)/gi;

export function redactDiagnostic(value: string): string {
  return value.replace(SECRET_PATTERN, '$1$2[REDACTED]').slice(0, 4000);
}

/** Default local monitor. Replace this implementation with Sentry or another
 * provider without changing the global exception contract. */
export class LoggerErrorMonitor implements ErrorMonitor {
  constructor(private readonly logger = new Logger('ErrorMonitor')) {}

  capture(event: ErrorMonitoringEvent): void {
    const { stack, technicalMessage, ...safeContext } = event;
    this.logger.error(
      JSON.stringify({
        ...safeContext,
        technicalMessage: redactDiagnostic(technicalMessage),
      }),
      stack ? redactDiagnostic(stack) : undefined,
    );
  }
}
