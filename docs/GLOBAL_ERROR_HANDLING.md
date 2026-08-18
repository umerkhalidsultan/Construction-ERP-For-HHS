# Global error handling and validation

This document defines the single error contract for the Construction ERP. New modules must use these shared backend and frontend primitives rather than introducing page-specific response formats or displaying exception text.

## API contract

Successful responses remain `{ "success": true, "data": ... }`. Error responses use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": {
      "employmentTypeId": "Please select an employment type."
    },
    "requestId": "7ed6a870-..."
  }
}
```

The response temporarily retains the former top-level `code`, `message`, `fields`, and `requestId` properties so existing clients can migrate without a breaking release. The nested `error` object is canonical.

Unexpected server errors always receive a request ID and a generic message with a short reference. ORM errors, SQL state, stack traces, paths, and infrastructure details are only sent to the protected diagnostic monitor.

## Backend architecture

- `AppError` and its validation, authentication, authorization, conflict, not-found, and business-rule subclasses represent expected failures.
- `GlobalExceptionFilter` is the only HTTP error formatter.
- `ValidationPipe` converts DTO failures into field-keyed `ValidationAppError` instances.
- `mapPrismaError` maps known Prisma and PostgreSQL constraint/availability failures without parsing or returning raw database messages.
- `sanitizeUserMessage` is a final leak-prevention boundary for legacy `HttpException` messages.
- `ErrorMonitor` separates developer diagnostics from public responses. The default structured logger records request ID, endpoint, method, module, status, user, company, environment, error code, technical message, and stack. Secret-like values are redacted. It can be replaced by Sentry without changing controllers.

Controllers and services should throw the most specific `AppError`. They must not catch an exception merely to return `{ error: ... }`, and must never return an ORM exception.

## Error codes

The shared categories cover validation, invalid/required/expired authentication, permission denial, missing records, duplicates, invalid state/business rules, database availability, network, timeout, server, file upload, rate limiting, and unknown failures. Frontend behavior is keyed by `code` and status, never by matching raw backend text.

## Frontend architecture

- `apiRequest` parses the canonical response, turns it into `ApiError`, applies a 30-second timeout, distinguishes offline/network failures, refreshes expired sessions, forwards optional idempotency keys, and sanitizes legacy technical messages.
- Query retries are limited to transient read failures. Mutations do not automatically retry.
- `applyApiFieldErrors` maps server `fields` into React Hook Form and focuses the first invalid control.
- `Input` and `Select` associate errors with controls using `aria-invalid` and `aria-describedby`.
- `FormErrorSummary`, `QueryErrorState`, `EmptyState`, `DataTable`, `ToastProvider`, and `ConfirmDialog` provide consistent accessible feedback.
- `ErrorBoundary` and global browser error listeners prevent runtime exception text from replacing the UI and pass diagnostics through the frontend monitoring interface.

Submit buttons must remain disabled while a mutation is pending. Destructive actions use `ConfirmDialog`. Recoverable reads expose Retry. Empty collections are not errors.

## Validation order

1. Basic client validation for immediate feedback.
2. DTO validation at the API boundary.
3. Authentication and authorization.
4. Business and state rules.
5. Database constraints as a final integrity boundary.
6. Transactional processing for multi-record operations.

Frontend validation is never a security or integrity boundary. Services that perform multiple dependent writes must continue to use Prisma transactions so an exception rolls the complete operation back.

## Idempotency for future financial modules

The web client already accepts `idempotencyKey` and sends `Idempotency-Key`. Before payments, invoices, journal posting, receipts, or bank transactions are introduced, the API must persist the key with company, actor, operation, request hash, status, and response inside the same database transaction. A repeated matching request returns the stored response; a reused key with a different hash is rejected. Do not enable mutation retries until that server-side guarantee exists.

## Message and security rules

Messages use short, actionable English and field labels rather than schema names. Never include SQL, model/table names, IDs for sensitive resources, exception classes, stack frames, server paths, tokens, passwords, secrets, or environment values. Permission failures use a generic message and must not reveal whether a protected record exists.

Only security-relevant or sensitive backend failures belong in the audit trail. Ordinary client validation is not an audit event. Diagnostic logging and business auditing remain separate.

## Current module audit

The implemented application currently contains authentication, dashboard, companies and organization records, projects and planning, workforce, and storage/document flows. Their requests now pass through the shared backend filter and frontend API boundary. Major company, project, and employee forms use shared field/form feedback; destructive company, organization, and workforce actions use the shared dialog; core list and organization-chart reads expose loading, empty, error, and retry states.

The requested BOQ, estimating, clients, vendors, contracts, procurement, inventory, subcontractor, accounting, invoice, payment, expense, reporting, and notification business modules are not present in the current route/module tree. Their example business rules cannot be tested until those modules exist; they must adopt this contract when implemented.

## Manual verification checklist

- Submit company, project, login, and employee forms with required fields empty and with invalid dates/identifiers.
- Create a duplicate company, employee email/code, and organization code.
- Load a protected route with an expired token and with insufficient permission.
- Stop the API and database separately; confirm a safe retry/availability message and no raw console text in the UI.
- Use browser throttling to trigger the request timeout.
- Try unsupported and oversized uploads.
- Inspect mobile widths and keyboard navigation for summaries, dialogs, and toasts.
- Look up an injected server failure by its displayed request reference in protected logs.
