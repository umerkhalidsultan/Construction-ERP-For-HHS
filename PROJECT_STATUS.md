# Construction ERP — Project Status

Living status document. Update this file when a module’s implementation state changes. Record what is actually in the repository, not what was planned.

Last audited: 2026-08-27

---

## Project Objective

First internal deployment for the construction company.

Long-term objective:

Commercial SaaS Construction ERP.

The product is a modular monolith: React web client, NestJS API, PostgreSQL via Prisma, optional Cloudflare R2 storage.

---

## Current Development Phase

**Foundation complete; operational modules in active development; CRM Dashboard, Analytics & Sales Performance (Module 2.1.5) is implemented on the existing CRM data model.**

Evidence from the repository (not a guess):

- Two git commits exist: initial foundation (company/organization, auth, projects) and a follow-up adding workforce, CRM, quality, and global error handling (2026-08-18).
- CRM Opportunities, Activities, and Dashboard Analytics now have schema-backed APIs, RBAC, service tests, and responsive web routes in the working tree.
- Many construction modules listed in product vision have no code.

This is not a production-complete ERP. It is a working internal-platform foundation with several real modules behind auth, RBAC, and tenant isolation.

`docs/PHASE2_ROADMAP.md` still describes JWT, company CRUD, audit, R2, and tests as future work. Those items are already implemented. Treat that roadmap as historical.

---

## Completed Modules

Only modules that have database, API, authorization, and working UI are listed here. Schema-only or API-only work is not listed as completed.

### Authentication

- **Status:** Implemented for login/session; incomplete for recovery/MFA
- **Important functionality:** Email/password login, bcrypt passwords, JWT access token, rotating refresh token (DB session + httpOnly cookie), logout, security event log, global JWT guard
- **Known limitations:** Password reset UI is a disabled stub; MFA columns exist but are unused; access token is persisted in browser storage via Zustand; no dedicated CSRF token (refresh cookie uses `SameSite=strict`)

### Company & Organization

- **Status:** Implemented
- **Important functionality:** Tenant company CRUD, settings, branding + R2 logo upload, branches, departments, designations, cost centers, organization chart, document numbering sequences, company dashboard aggregates
- **Known limitations:** Business units, regions, teams, and reporting lines have API endpoints but no dedicated web pages (org chart consumes some hierarchy). Company create is platform-admin only.

### Project Lifecycle

- **Status:** Implemented
- **Important functionality:** Project CRUD, lifecycle statuses, phases, milestones, team, documents metadata, calendar events, tags, settings, dashboard/timeline routes
- **Known limitations:** `clientId` / consultant / architect IDs are placeholders without CRM FKs on `Project`. Dashboard still stubs some future operational widgets (approvals, material requests, POs). Document records can link `FileObject` or an external URL; there is no full DMS version-control module.

### Project Planning & Scheduling

- **Status:** Implemented
- **Important functionality:** WBS, activities, dependencies, Gantt data, baselines, progress updates, schedule recalculation, Hold Point integration with Quality
- **Known limitations:** Planning UI is feature-rich but dense; no dedicated Android/offline client. No Microsoft Project / Primavera import.

### Workforce & Identity

- **Status:** Implemented
- **Important functionality:** Employees distinct from Users, employment history, skills, certifications, licenses, documents, project assignments, transfers, workforce org chart
- **Known limitations:** Attendance, leave, payroll, recruitment, and performance are out of scope and not implemented. User login provisioning from an employee is not a full admin workflow.

### QA/QC Quality Management

- **Status:** Implemented on API; partial UI
- **Important functionality:** Standards, quality plans, ITPs, checklists, inspections (including `clientMutationId` dedupe), tests with numeric pass/fail and override, NCRs, corrective actions, defects/punch/observations, rework, material/method submittals, samples, evidence links, quality outbox events, Hold Point blocking of 100% activity progress
- **Known limitations:** Web UI (`ProjectQualityPage`) covers dashboard, inspections, ITPs, tests, NCRs, and issues. Plans, submittals, samples, rework, checklists, and evidence management are API-capable but not first-class screens. Outbox has no dispatcher. No PDF reports. No Android field app.

### CRM Leads

- **Status:** Implemented
- **Important functionality:** Lead register, create/edit, assignment, status changes, notes, attachments to existing `FileObject`, duplicate check, dashboard KPIs, timeline from audit log, optional link to CRM company/contact, `LEAD-{YYYY}-######` numbering
- **Known limitations:** `CRM.Lead.Export` is seeded but no export endpoint/UI exists. Conversion to Opportunity is not implemented (Opportunity API does not exist).

### CRM Companies & Contacts

- **Status:** Implemented
- **Important functionality:** External party masters (`CrmCompany`, `CrmContact`), types, assignment, notes, attachments, duplicate check, primary contacts, global CRM search, lead party linking
- **Known limitations:** Merge permissions are seeded; merge execution is deferred. No CSV import/export. No company-to-company relationship graph.

### CRM Opportunities, Activities & Analytics

- **Status:** Implemented
- **Important functionality:** Opportunity register, conversion from qualified leads, sales pipeline, exact Decimal weighted values, stage history, won/lost handling, CRM activities/follow-ups, calendar/team views, company-scoped sales forecast, and a consolidated CRM dashboard.
- **Dashboard analytics:** Date ranges, per-currency pipeline and weighted pipeline, lead conversion, source/type/user performance, forecast, loss reasons, stage aging, configurable stale-opportunity health, monthly CRM movement, overdue follow-ups, and actionable links to existing lists.
- **Security and scope:** Dashboard aggregates are calculated server-side, enforce the active company, clamp own/team/all scope to RBAC permissions, and keep money grouped by currency.
- **Known limitations:** No generic export engine or PDF reports; dashboard location and client ranking are deferred until richer consistent source data and reporting requirements are available. Trend pipeline is labelled as newly created pipeline, not historical point-in-time pipeline.

---

## In Progress

### Quality web coverage

- Backend is ahead of the UI for plans, submittals, samples, rework, and evidence.

### Platform admin / identity administration

- Seed can create a bootstrap platform admin.
- `UsersModule`, `RolesModule`, and `PermissionsModule` are empty. There is no runtime user-invite or role-editor UI.

---

## Known Bugs

No confirmed production defects were reproduced during this documentation audit. The following are incomplete or non-functional surfaces that look like features but do not work:

- **Forgot password** (`/forgot-password`): submit button is disabled; no API exists. Not a crash, but the flow is inoperable.
- **Rate limiting:** `@nestjs/throttler` is imported in `AppModule` with 100 req/60s, but `ThrottlerGuard` is not registered, so the limit is not enforced.

Do not invent additional bugs. If a new defect is found, add it here with the module name and how it was observed.

---

## Known Technical Debt

- `docs/PHASE2_ROADMAP.md` is outdated.
- Redis is defined in `docker-compose.yml` and `.env.example` but no application code uses Redis.
- `NotificationsModule` is an empty Nest module. Quality writes outbox rows that nothing consumes.
- Cloudflare R2 branding upload works only when R2 env vars are set; otherwise storage throws service-unavailable. Generic document binary upload is not a shared module; CRM attaches existing `FileObject` IDs.
- Virus scan fields exist; files are stored as `NOT_SCANNED`.
- Access token stored in `localStorage` (Zustand persist `hhs-erp-auth`).
- Frontend does not consume permission codes for nav visibility.
- `apps/web/web` is an unused Vite starter app nested inside the real web workspace.
- `apps/web/vite.config.ts` still aliases `@supabase/supabase-js` even though the app does not depend on or import Supabase.
- `packages/` and `shared/` workspaces are empty placeholders.
- `SUPABASE/Database.SQL` is an empty untracked file and is not part of the runtime architecture.
- No Dockerfiles for the API or web apps; Compose only runs Postgres and Redis.
- No GitHub Actions / CI.
- No Playwright/Cypress.
- Server-side idempotency store for generic mutations is not implemented (quality inspections use `clientMutationId` instead).
- Project dashboard still returns empty arrays for modules that do not exist.
- Lead/Opportunity export permissions exist without exporters.

---

## Planned Modules

### Implemented

- Authentication (login/session)
- Company & Organization
- Projects
- Planning / WBS / Gantt / baselines
- Workforce
- Quality (API complete, UI partial)
- CRM Leads
- CRM Companies & Contacts
- Audit logging (service used by modules)
- Branding file storage (R2)
- Global error handling

### In Progress

- Quality additional screens
- Identity administration (empty Nest modules)

### Planned / Not Started

These appear in product vision, settings JSON placeholders, or Phase 2 notes, and have **no working module** in `apps/`:

- Tenders
- Estimating
- BOQ
- Procurement / purchase orders
- Vendors (as a dedicated procurement vendor module; CRM company types can already label a party as supplier)
- Subcontractors (dedicated module)
- Site management / daily progress / attendance
- Materials / Inventory / Warehouses
- Equipment
- HR beyond workforce identity (leave, recruitment, appraisals)
- Payroll
- Accounting / invoices / payments / expenses / journal
- Contracts
- Documents (full DMS)
- Reports / PDF engine
- Notifications (email and in-app)
- Workflow / approval engine
- Redis cache
- BullMQ workers
- Android native app
- SaaS billing portal
- CI/CD

---

## Current Authentication

Custom NestJS authentication.

| Piece | Implementation |
|---|---|
| Identity store | PostgreSQL `users` |
| Password | bcrypt |
| Access token | JWT, `Authorization: Bearer`, default 900s |
| Refresh token | JWT, hashed on `sessions`, httpOnly cookie `erp_refresh_token`, default 7 days, rotation |
| Guards | Global `JwtAuthGuard`; `@Public()` for login/refresh/logout/health |
| Frontend session | Zustand persist + cookie refresh |
| Not used | Supabase Auth, OAuth, SSO, MFA, password reset email |

Company context is selected at login (`LoginDto.companyId` optional; otherwise first active membership). Platform admins may log in without a membership.

---

## Current RBAC

Database-backed RBAC.

- Tables: `permissions`, `roles`, `role_permissions`, `membership_roles`
- Enforcement: `PermissionsGuard` + `@RequirePermissions`
- Constants: `apps/api/src/permissions/permission.constants.ts`
- Seeded system roles include Super Admin, Company Admin, Director, Project Manager, Site Engineer, QA/QC Manager, QA/QC Engineer, Procurement Officer, Store Keeper, HR, Accountant, Employee, Viewer, Business Development Manager, Business Development Executive
- Platform admin bypasses permission checks
- No runtime role-admin API/UI

---

## Current Database

- Engine: PostgreSQL 15 (Docker image `postgres:15-alpine`)
- ORM: Prisma 6
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seed: `prisma/seed.ts` (permissions, roles, catalogs, optional bootstrap admin)
- Database name default: `construction_erp`
- Tenant model: shared schema, row-level `companyId`
- Money: `Decimal(18,2)`
- Soft deletes: `deletedAt`

Applied/present migrations (by filename):

1. `20260810144000_company_organization_foundation`
2. `20260810180000_project_lifecycle`
3. `20260818143727_workforce_identity`
4. `20260818190000_project_planning`
5. `20260818213000_planning_hardening`
6. `20260818223000_quality_management`
7. `20260818231500_quality_submittals`
8. `20260818234500_crm_leads_foundation`
9. `20260818235000_crm_leads_schema`
10. `20260819003000_crm_companies_contacts`
11. `20260819120000_crm_opportunities_pipeline` (present in working tree at audit; Opportunity API not present)

---

## Current Frontend

- App: `apps/web` (`@hhs-erp/web`)
- React 19, TypeScript, Vite 8, Tailwind CSS 4
- Routing: React Router 7
- Server state: TanStack Query 5
- Auth state: Zustand 5
- Forms: React Hook Form + Zod
- Design: custom UI kit, Lucide icons, primary color `#0369a1`
- Dev URL: `http://localhost:5173` (proxies `/api` to port 3000)
- Tests: Vitest + Testing Library
- No native Android/iOS project

---

## Current Backend

- App: `apps/api` (NestJS 11, TypeScript)
- Prefix: `/api`, URI version `v1`
- Validation: class-validator / class-transformer + Joi env schema
- Docs: Swagger at `/api/docs`
- Security middleware: helmet, CORS (`FRONTEND_URL`, credentials), compression, cookie-parser
- Architecture style: modular monolith; companies/projects/workforce use application/domain/infrastructure layers; CRM and quality are flatter module folders
- ORM access: `PrismaService`

---

## Current Deployment

Identifiable from the repo:

- `docker-compose.yml` runs PostgreSQL 15 and Redis 7 only
- No application Dockerfiles
- No Kubernetes/Helm/Nginx configs
- No CI workflow under `.github/`
- Local run: copy `.env.example` → `.env`, `npm install`, `docker compose up -d`, `npm run db:migrate:deploy`, `npm run db:seed`, `npm run dev`
- Node `>=20 <25`

Redis is started but unused by the API.

---

## Current Testing

| Layer | Tool | Location |
|---|---|---|
| API unit | Jest | `apps/api/src/**/*.spec.ts` |
| API e2e | Jest + Supertest | `apps/api/test/*.e2e-spec.ts` (app, workforce, quality, CRM leads, CRM parties) |
| Web unit | Vitest | error messages, utils, ConfirmDialog, website URL |
| Browser E2E | None | — |
| CI | None | — |

Coverage is stronger on companies, workforce, planning engine, quality, CRM, and the global error filter than on auth controllers or frontend pages.

---

## Current Security

Implemented:

- JWT authentication and refresh rotation
- Server-side RBAC
- Tenant checks in guard + services
- DTO whitelist / forbid non-whitelisted
- Helmet, CORS allowlist, httpOnly refresh cookie
- Bcrypt passwords
- Audit log with secret key redaction
- Error sanitization (no SQL/ORM/stack in responses)
- Branding upload size/type processing via sharp
- Request context (request ID, IP, user agent)

Missing or incomplete:

- Throttler guard not applied
- Password reset / email verification / MFA
- Virus scanning
- User/role administration UI
- Server-side generic idempotency
- Frontend permission-aware navigation
- Access token not in memory-only storage

---

## Important Decisions

### Decision: Construction-Specific ERP

Status: Confirmed

Reason: Product is intended specifically for construction businesses, first internally, then as SaaS.

### Decision: Modular monolith

Status: Implemented

Reason: Single NestJS API and single React app keep deployment simple for the first internal release. `packages/` and `shared/` are reserved, not used.

### Decision: Company is the tenant

Status: Implemented

Reason: Every future domain entity must reference `companyId`. Users are global; memberships grant company access.

### Decision: Custom JWT authentication

Status: Implemented

Reason: NestJS JWT + Passport + Prisma sessions. Not Supabase Auth.

### Decision: Database-backed RBAC

Status: Implemented

Reason: Permission codes are data, seeded, and enforced by a global guard. Frontend hiding is not a security boundary.

### Decision: Centralized Error Handling

Status: Implemented

Reason: Prevent raw technical errors from reaching users. Canonical envelope is documented in `docs/GLOBAL_ERROR_HANDLING.md`.

### Decision: Soft delete + audit trail

Status: Implemented

Reason: Business records keep `deletedAt`. Sensitive mutations write `AuditLog` inside the same Prisma transaction.

### Decision: Prisma + PostgreSQL

Status: Implemented

Reason: Migrations, Decimal money types, composite tenant foreign keys.

### Decision: Cloudflare R2 for object storage

Status: Partially implemented

Reason: Branding assets upload through S3-compatible R2. General document upload pipeline is not a shared service yet. CRM/project documents reference `FileObject`.

### Decision: Employee is not User

Status: Implemented

Reason: Workforce people can exist without login. Authorization still uses `CompanyMembership`.

### Decision: CRM parties are not tenants

Status: Implemented

Reason: `CrmCompany` / `CrmContact` are external parties inside a tenant. This avoids overloading `Company`.

### Decision: Quality Hold Points affect the schedule

Status: Implemented

Reason: Completing an activity to 100% is blocked until linked Hold Point inspections pass or close.

### Decision: Notifications are out of band

Status: Placeholder only

Reason: Quality writes `quality_outbox_events`. There is no worker or email provider. Forgot-password copy refers to a future mail provider.

### Decision: Decimal money types before accounting exists

Status: Implemented

Reason: Project, CRM, and quality cost fields already use `Decimal(18,2)` so later accounting does not inherit floats.

---

## Next Recommended Work

Do not implement this as part of a documentation task.

**Recommended next development task: Quality additional screens on the existing quality APIs.**

Why this is next:

1. Quality backend capabilities are ahead of their first-class web coverage.
2. CRM Module 2.1.5 is complete and should not be expanded into tender management automatically.
3. This work can reuse existing quality entities and APIs without creating a second operational system.
4. Construction CRM flow is Lead → Opportunity → (later) tender/estimate/project. Building a different module first would leave a half-finished CRM.

Scope when that work starts:

- Reuse `Opportunity*` Prisma models. Do not create duplicates.
- Nest APIs under `/api/v1/companies/:companyId/crm/opportunities`.
- Enforce existing `CRM.Opportunity.*` permissions server-side.
- Add list/kanban or stage board, create/edit, assign, stage change, mark won/lost, reopen, notes, activities, attachments, forecast totals.
- Convert a lead into an opportunity using `CRM.Opportunity.ConvertLead`.
- Tests for tenant isolation, invalid stage transitions, and unauthorized access.
- Update this file when the module is actually usable.

A close alternative, if commercial SaaS admin is prioritized over CRM: implement Users/Roles APIs and UI on the existing membership/RBAC tables. Do not replace those tables.
)
