# Construction ERP — System Architecture

This document describes the architecture that exists in the repository today. It is the map AI agents should follow. If something is not described here as implemented, inspect the code before assuming it exists.

---

## 1. System Overview

The Construction ERP is a **modular monolith**.

```text
Browser (React / Vite)
        |  HTTPS in production; Vite proxy in development
        |  Authorization: Bearer <access JWT>
        |  Cookie: erp_refresh_token (httpOnly)
        v
NestJS API  (/api/v1)
        |  Prisma Client
        v
PostgreSQL 15
        |
        +-- optional Cloudflare R2 (branding images)
```

There is one web application (`apps/web`) and one API (`apps/api`). They share a Prisma schema at the repository root.

Request flow for a typical business call:

1. React page uses TanStack Query and a service in `apps/web/src/services`.
2. `apiRequest` attaches the access token and optional `Idempotency-Key`.
3. Nest global `JwtAuthGuard` authenticates the user and loads company membership.
4. Global `PermissionsGuard` checks `@RequirePermissions` and route `companyId`.
5. Controller validates DTOs, then the service asserts tenant access and applies business rules.
6. Prisma writes occur in a transaction when multiple rows must stay consistent. `AuditService.record` is called inside that transaction.
7. `TransformInterceptor` wraps success payloads. `GlobalExceptionFilter` wraps failures.

`Company` is the SaaS tenant. `Project` is the operational hub for site work. CRM parties are external businesses inside a tenant.

---

## 2. Technology Stack

Documented from `package.json`, Prisma, Docker Compose, and source imports. Unused or leftover items are called out.

### Frontend

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4 (`@tailwindcss/vite` + `@theme` in `index.css`)
- React Router 7
- TanStack Query 5
- Zustand 5 (auth persist)
- React Hook Form 7 + Zod + `@hookform/resolvers`
- Lucide React
- Vitest + Testing Library
- ESLint

Not present as application dependencies: Redux, Next.js, Flutter, React Native, Supabase JS client (only a leftover Vite alias).

### Backend

- NestJS 11
- TypeScript
- Prisma 6 (`@prisma/client`)
- PostgreSQL
- Passport JWT
- bcrypt
- class-validator / class-transformer
- Joi (environment validation)
- Swagger (`@nestjs/swagger`)
- Helmet, compression, cookie-parser
- `@nestjs/throttler` (module registered; guard not applied)
- AWS SDK S3 client (Cloudflare R2)
- Multer + sharp + file-type (branding uploads)

Not present in API code: Redis client, BullMQ, Supabase SDK, TypeORM, GraphQL.

### Database

- PostgreSQL 15 Alpine via Docker Compose
- Prisma Migrate
- `provider = "postgresql"`

### ORM

- Prisma schema: `prisma/schema.prisma`
- Nest wrapper: `apps/api/src/prisma`

### Authentication

- Custom JWT (access + refresh)
- Prisma `User`, `Session`, `UserSecurityLog`
- Not Supabase Auth

### Storage

- Cloudflare R2 for company branding when env vars are set
- `FileObject` metadata in PostgreSQL
- No local disk document store in the API

### Deployment

- Docker Compose: Postgres + Redis only
- Local Node processes for API (port 3000) and Vite (port 5173)
- No app Dockerfiles, no CI, no Kubernetes manifests in this repository

### Redis

- Container is defined (`redis:7-alpine`, AOF enabled)
- No Nest module or client uses it

---

## 3. Repository Structure

```text
.
├── AI_RULES.md
├── ARCHITECTURE.md
├── PROJECT_STATUS.md
├── README.md
├── package.json                 # npm workspaces root
├── docker-compose.yml           # postgres + redis
├── .env.example
├── apps/
│   ├── api/                     # NestJS API (real backend)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/
│   │   │   ├── audit/
│   │   │   ├── companies/       # clean architecture layers
│   │   │   ├── projects/        # lifecycle + planning/
│   │   │   ├── workforce/
│   │   │   ├── quality/
│   │   │   ├── crm/
│   │   │   ├── storage/
│   │   │   ├── common/          # guards, errors, interceptors
│   │   │   ├── prisma/
│   │   │   ├── permissions/     # PERMISSIONS constants only
│   │   │   ├── users/           # empty Nest module
│   │   │   ├── roles/           # empty Nest module
│   │   │   └── notifications/   # empty Nest module
│   │   └── test/                # e2e
│   └── web/                     # React SPA (real frontend)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   ├── components/      # ui + feedback + layout
│       │   ├── services/
│       │   ├── store/
│       │   └── lib/             # api-client, errors
│       └── web/                 # UNUSED Vite scaffold — do not extend
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── docs/                        # module design notes (may lag the code)
├── packages/                    # empty workspace placeholder
├── shared/                      # empty workspace placeholder
└── docker/                      # reserved; not populated
```

Ignore `apps/web/web` for product work. Ignore empty `SUPABASE/` dumps; they are not the database of record.

---

## 4. Multi-Tenant Architecture

**Shared-database, shared-schema, discriminator column `companyId`.**

```text
User (global)
   └── CompanyMembership (userId + companyId)
            ├── MembershipRole → Role → Permission
            └── scoped work (projects, employees, leads, …)

Company (tenant root)
   ├── CompanySettings / CompanyBranding
   ├── org structure (Branch, Department, …)
   ├── Project
   ├── Employee
   ├── Lead / CrmCompany / CrmContact / Opportunity
   └── FileObject / AuditLog / DocumentSequence
```

Isolation mechanisms that already exist:

1. JWT payload `companyId` + `membershipId` validated against `company_memberships`.
2. `PermissionsGuard` compares `request.params.companyId` to `principal.companyId`.
3. Services call `assertCompanyAccess`.
4. Prisma composite foreign keys such as `CrmContact (id, companyId)` prevent cross-tenant relation stitching.
5. List queries for non-platform users pass `tenantCompanyId`.

Platform administrators (`users.isPlatformAdmin`) may create companies and omit membership context. That is the only cross-tenant role.

**Do not add a second tenant table. Do not trust `companyId` on request bodies.** DTOs must not include `companyId` as a writable client field.

SaaS subscription columns already live on `Company` (`subscriptionStatus`, `subscriptionPlan`, limits). There is no billing integration.

---

## 5. Authentication Architecture

```text
POST /api/v1/auth/login
  → verify user ACTIVE, bcrypt password
  → select CompanyMembership
  → issue access JWT + refresh JWT
  → persist Session.refreshTokenHash
  → set cookie erp_refresh_token
  → return accessToken + user + memberships (refresh omitted from JSON body)

POST /api/v1/auth/refresh
  → cookie or body token
  → verify, revoke old session, issue new pair (rotation)

POST /api/v1/auth/logout
  → revoke session, clear cookie
```

Access token payload (`AccessTokenPayload`):

- `sub` (user id)
- `email`
- `companyId`
- `membershipId`
- `isPlatformAdmin`
- `type: "access"`

`JwtStrategy.validate` reloads the user and membership from the database. A disabled user, archived company, or revoked membership fails even if the JWT has not expired.

Frontend:

- `LoginPage` → `auth.service` → `useAuthStore.setAuth`
- Persist key: `hhs-erp-auth`
- `ProtectedRoute` only checks `isAuthenticated`
- 401 triggers `/auth/refresh` then retry

Public routes: login, refresh, logout, health, forgot-password page (page only).

---

## 6. RBAC Architecture

Permission codes are stable strings. Example: `Company.View`, `Project.Edit`, `Quality.NCR.Close`, `CRM.Opportunity.MarkWon`.

Enforcement path:

```text
@Controller method
  @RequirePermissions(PERMISSIONS.X, PERMISSIONS.Y)
        ↓
PermissionsGuard
  public? → allow
  no metadata? → allow (authenticated only)  ← do not use this for sensitive routes
  platform admin? → allow
  route companyId mismatch? → 403
  load Permission rows granted through MembershipRole for this membership
  every required code present? → allow else 403
```

Roles are seeded, not edited in the UI. System roles have `companyId = null`. Company-specific roles are supported by the schema (`roles.companyId`) but there is no admin API to manage them yet.

Frontend must not be treated as an authorization layer. Today the sidebar does not filter by permission codes.

When adding a feature, add a constant, seed the code, attach it to Super Admin / Company Admin / the operational role, and decorate the controller.

---

## 7. API Architecture

- Global prefix `api`, version URI `v1` → `/api/v1/...`
- Swagger UI: `/api/docs`
- JSON only
- Global `ValidationPipe`: whitelist, transform, forbidNonWhitelisted
- Global `TransformInterceptor`
- Global `GlobalExceptionFilter`
- Request context middleware stores request ID, IP, user agent, principal

### Route map (implemented)

| Area | Base |
|---|---|
| Health | `GET /health` |
| Auth | `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Companies | `/companies`, `/companies/:companyId`, settings, branding, dashboard |
| Org entities | `/companies/:companyId/branches\|departments\|designations\|cost-centers` |
| Org extras | `/companies/:companyId/organization/{business-units,regions,teams,reporting-lines}` |
| Numbering | `/companies/:companyId/document-sequences` |
| Projects | `/companies/:companyId/projects` |
| Project children | `.../projects/:projectId/{phases,milestones,team,documents,calendar,settings,tags}` |
| Planning | `.../projects/:projectId/planning/{dashboard,wbs,activities,gantt,baselines,progress}` |
| Quality | `.../projects/:projectId/quality/...` |
| Workforce | `/companies/:companyId/workforce/employees/...` |
| CRM leads | `/companies/:companyId/crm/leads` |
| CRM parties | `/companies/:companyId/crm/{companies,contacts,search,catalog}` |

There is no Opportunity controller at the time of this document.

Controllers should stay thin. Business rules belong in services. Companies, projects, and workforce follow `presentation → application → domain repository → prisma infrastructure`. CRM and quality keep service + controller in the module folder; follow the local style when extending those modules rather than forcing a large move.

---

## 8. Database Architecture

Prisma is the source of truth. Generate client with `npm run db:generate`. Apply with `npm run db:migrate:deploy`.

Conventions:

- UUID primary keys
- `companyId` on tenant data
- `@@unique([id, companyId])` on tenant aggregates used in composite FKs
- Soft delete via `deletedAt`
- Restrict `onDelete` for business FKs (avoid cascade wipes)
- `Decimal(18,2)` money, `Decimal(18,4)` quantities, `Decimal(10,7)` coordinates
- JSON columns for settings blobs (`taxSettings`, `payrollRules`, etc.) — these are placeholders, not working payroll/tax engines

Major model groups:

- Identity: `User`, `Session`, `UserSecurityLog`, `CompanyMembership`
- Access: `Role`, `Permission`, `RolePermission`, `MembershipRole`
- Tenant: `Company`, `CompanySettings`, `CompanyBranding`
- Org: `Branch`, `Department`, `Designation`, `BusinessUnit`, `Region`, `CostCenter`, `Team`, `ReportingLine`
- Files / audit / numbering: `FileObject`, `AuditLog`, `DocumentSequence`
- Projects: `Project`, settings, phases, tasks, WBS, dependencies, baselines, progress, milestones, team, documents, calendar, tags
- Workforce: `Employee`, `Employment`, skills, credentials, documents, project assignments
- Quality: plans, ITP, inspections, tests, NCR, actions, issues, rework, evidence, submittals, samples, outbox
- CRM: `Lead*`, `CrmCompany*`, `CrmContact*`, `Opportunity*`

Do not create `clients`, `customers`, or `accounts` tables that duplicate `CrmCompany` / `CrmContact`.

---

## 9. Module Architecture

| Module | Nest path | Web path | Notes |
|---|---|---|---|
| Auth | `auth/` | `pages/auth/` | JWT |
| Companies | `companies/` | `pages/companies/` | Tenant root |
| Projects | `projects/` | `pages/projects/` | Includes planning |
| Workforce | `workforce/` | `pages/workforce/` | |
| Quality | `quality/` | `pages/quality/` | Nested under project |
| CRM | `crm/` | `pages/crm/` | Leads + parties; no opportunities UI |
| Storage | `storage/` | branding page | R2 |
| Audit | `audit/` | (timeline via APIs) | Not a user-facing module |
| Common | `common/` | `lib/errors`, `components/feedback` | Cross-cutting |

Empty Nest modules that must not be mistaken for features: `users`, `roles`, `permissions` (constants live beside the empty module), `notifications`.

---

## 10. Frontend Architecture

Entry: `apps/web/src/main.tsx`

- `ErrorBoundary` + `ToastProvider` wrap `App`
- Global JS error listeners in `installGlobalErrorMonitoring`

Routing is declared in `App.tsx`. Authenticated routes sit under `ProtectedRoute` → `DashboardLayout`. Company-scoped URLs look like:

`/companies/:companyId/projects/:projectId/planning`

State:

- **Server state:** TanStack Query. Query keys include `companyId` / `projectId`.
- **Auth state:** Zustand persist. Do not put server lists in Zustand.
- **Forms:** React Hook Form + Zod, then trust API field errors.

UI kit (reuse these):

- `components/ui`: Button, Input, Select, DataTable, Badge, Alert, PageHeader
- `components/feedback`: Toast, ConfirmDialog, FormErrorSummary, ErrorBoundary
- `components/layout`: DashboardLayout, ProtectedRoute

Styling: Tailwind utility classes, `primary-*` scale, `min-w-[320px]`, sidebar hidden below `md`. Prefer `flex-wrap` and stacked forms on small screens.

Services are thin fetch wrappers (`companies.service.ts`, `crm.service.ts`, …). They must use `apiRequest`, not raw `fetch`, so refresh and error mapping stay consistent.

---

## 11. Error Handling Architecture

Canonical contract: `docs/GLOBAL_ERROR_HANDLING.md`

Success: `{ status: "success", success: true, message, data, pagination?, timestamp, requestId }`

Error: `{ status: "error", success: false, code, message, data: null, fields?, errors?, timestamp, requestId, error: { code, message, fields?, requestId } }`

Backend types: `AppError`, `ValidationAppError`, `BusinessRuleError`, `ConflictAppError`, `NotFoundAppError`, `ForbiddenAppError`, `AuthenticationAppError`.

Prisma errors are mapped in `database-error.mapper.ts`. Unknown 500s return a generic message plus a short request-ID reference.

Frontend `ApiError` carries `status`, `code`, `fields`, `requestId`. Display `error.message` from that class, never `exception.stack`.

---

## 12. Audit Architecture

`AuditService` writes `audit_logs` using the current request context:

- companyId, userId, action, entity, entityId
- oldValue / newValue JSON (keys such as `password`, `accessToken`, `refreshToken` redacted)
- ipAddress, browser, requestId

Call `audit.record(tx, entry)` **inside** the same Prisma transaction as the business write.

Lead timelines are built from audit rows. Quality also emits `quality_outbox_events` for a future dispatcher; that is not a substitute for `AuditLog`.

Login events go to `user_security_logs`, not `audit_logs`.

---

## 13. File Storage Architecture

`FileObject` is the metadata record for blobs.

Current upload path:

- `POST /companies/:companyId/branding/assets/:purpose`
- `R2StorageService.uploadBrandAsset`
- Image processed with sharp, keyed as `{companyId}/branding/{purpose}/{uuid}.ext`
- Requires R2 env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

Other modules (CRM attachments, project documents, employee documents) accept an existing `fileId` that must belong to the same company and be `AVAILABLE`. There is no generic multipart document API yet. Do not invent a second file table.

`virusScanStatus` defaults to `NOT_SCANNED`. Do not claim malware scanning is active.

---

## 14. Validation Architecture

Order:

1. Zod / client form checks for immediate UX
2. DTO `class-validator` at the Nest boundary
3. Authentication
4. Authorization
5. Service business rules (`BusinessRuleError`, 422)
6. Database constraints

Frontend validation is not a security boundary.

Use `forbidNonWhitelisted` — extra JSON keys are rejected. This is the mass-assignment control.

Document numbers are allocated through `DocumentNumberingService` inside a transaction (projects `PROJ-…`, leads `LEAD-…`). New numbered documents must reuse this service.

---

## 15. Security Architecture

| Control | Where |
|---|---|
| Password hashing | bcrypt in `AuthService` |
| JWT secrets | env, Joi min length 32 |
| Session rotation | `sessions` table |
| HTTP headers | helmet |
| CORS | `FRONTEND_URL` + credentials |
| Cookies | httpOnly, sameSite strict, secure in production, path `/api/v1/auth` |
| Input allowlist | ValidationPipe |
| Tenant + RBAC | guards + services |
| Upload limits | `MAX_IMAGE_UPLOAD_BYTES` |
| Error hiding | GlobalExceptionFilter |
| Env validation | `environment.validation.ts` |

Gaps to preserve awareness of (do not “fix” by weakening something else): throttler guard unused, token in localStorage, no MFA, no password reset, Redis unused, no CI secret scanning in-repo.

SQL must go through Prisma. Raw SQL, if ever required, must use parameterized Prisma `$queryRaw` tagged templates and still filter `companyId`.

---

## 16. Testing Architecture

Root scripts: `npm test`, `npm run lint`, `npm run build`.

API Jest `rootDir` is `apps/api/src`. E2E config is `apps/api/test/jest-e2e.json`.

Web Vitest config: `apps/web/vitest.config.ts`.

When adding a module, add:

- Service spec for tenant isolation and business rules
- DTO or mapper spec if validation is non-trivial
- E2E spec for the main HTTP flow under `apps/api/test`

There is no shared test database documented beyond whatever the e2e specs configure locally. Do not point tests at production.

---

## 17. Deployment Architecture

Development:

1. Docker Compose → Postgres 5432, Redis 6379
2. `DATABASE_URL` in `.env`
3. Prisma migrate + seed
4. `npm run dev` starts API and Vite together (`concurrently`)

The API reads `PORT` (default 3000). The web app defaults `VITE_API_URL` to `/api/v1` and Vite proxies `/api` to `http://localhost:3000`.

Production deployment of the Node apps is not defined in this repository. When it is added, keep:

- `NODE_ENV=production`
- distinct `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `FRONTEND_URL` exact origin
- `prisma migrate deploy` (never `migrate dev` against production)
- R2 credentials only in the secret store

---

## 18. What Must Not Be Duplicated

Do not create a second copy of:

- `Company` / tenant model
- `User` login identity
- `CompanyMembership` authorization bridge
- Permission code system
- `FileObject` / another blob metadata table
- `AuditLog`
- `DocumentSequence`
- Global exception filter or a per-module error JSON
- A second API client besides `apiRequest`
- A second button/input/dialog kit
- `CrmCompany` as “Customer” or “Account”
- `Employee` as a replacement for `User`, or the reverse
- Opportunity models (they already exist in Prisma)

If a future module needs vendors or subcontractors, start from CRM party types or add a subtype that still references `CrmCompany`, unless a true operational vendor ledger is designed on purpose.

---

## 19. Future Architecture Constraints

These constraints apply when new modules are built:

- Remain a modular monolith until there is a measured reason to split processes.
- Every new business table needs `companyId` and tenant-safe FKs.
- Financial posting requires Decimal math and a persisted idempotency table before mutation retries are enabled.
- Notifications should consume the quality (and future) outbox, not a one-off email send inside a controller.
- Redis, if used, is for cache/session/queue — not a second source of truth.
- An Android client, when added, must call the same `/api/v1` contracts (quality already has `clientMutationId` / `syncVersion` for offline inspection).
- Do not switch authentication to Supabase or another provider without an explicit architecture decision recorded in `PROJECT_STATUS.md`.
- Do not introduce a second frontend (Next.js, Flutter) alongside `apps/web` for the same users.
- SaaS billing, when added, belongs on `Company`, not a parallel organization entity.

---

## 20. Environment Configuration

Root `.env.example` keys actually consumed or required:

| Variable | Use |
|---|---|
| `DATABASE_URL` / `DB_*` | PostgreSQL |
| `PORT`, `NODE_ENV`, `FRONTEND_URL` | API process and CORS |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, TTLs | Auth |
| `R2_*`, `MAX_IMAGE_UPLOAD_BYTES` | Branding storage |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Optional seed admin (min 12 char password) |
| `REDIS_HOST`, `REDIS_PORT` | Compose only; unused by API |
| `VITE_API_URL` | Web (defaults to `/api/v1`) |

Joi does not require Redis or R2. The API will start without R2; branding upload will fail until R2 is configured.
)
