# Company & Organization Management Module

## Purpose

This module is the tenant root of the Construction ERP. Every future domain entity (projects, employees, warehouses, purchase orders, invoices, documents, equipment) must reference `companyId`.

## Architecture

```
apps/api/src/companies/
  application/     # use-cases and service interfaces
  domain/          # repository contracts
  infrastructure/  # Prisma adapters
  presentation/    # REST controllers / DTOs
  dto/
```

Supporting platform services:

- `auth` — JWT access tokens, refresh sessions, company membership context
- `audit` — transactional old/new value logging
- `storage` — Cloudflare R2 branding uploads with image compression
- `permissions` — database-backed RBAC codes such as `Company.View`

## Multi-tenant model

- Shared PostgreSQL schema
- `Company` is the tenant aggregate
- `User` is a global identity
- `CompanyMembership` assigns a user to one or more companies
- Composite foreign keys (`id + companyId`) prevent cross-tenant relationship leaks
- Soft-delete uniqueness is enforced with partial indexes

## Entities

| Entity | Responsibility |
|--------|----------------|
| Company | Legal identity, subscription limits, regional defaults |
| CompanySettings | Working hours, fiscal year, units, policy JSON |
| CompanyBranding | Colors and brand asset file references |
| Branch | Operating locations with optional GPS |
| Department | Functional structure and heads |
| Designation | Job titles (separate from security roles) |
| CostCenter | Accounting-ready cost allocation units |
| BusinessUnit / Region / Team | Extended org structure |
| ReportingLine | Manager/subordinate hierarchy |
| DocumentSequence | Concurrency-safe document numbering |

## Key APIs

Base path: `/api/v1`

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /companies`
- `GET /companies`
- `GET /companies/:companyId`
- `PATCH /companies/:companyId`
- `DELETE /companies/:companyId`
- `POST /companies/:companyId/restore`
- `GET /companies/:companyId/dashboard`
- `GET|PATCH /companies/:companyId/settings`
- `GET|PATCH /companies/:companyId/branding`
- `POST /companies/:companyId/branding/assets/:purpose`
- CRUD under `/companies/:companyId/branches|departments|designations|cost-centers`
- Org structure under `/companies/:companyId/organization/*`
- Numbering under `/companies/:companyId/document-sequences`

## Permissions

| Code | Use |
|------|-----|
| Company.View | Read company profile/dashboard |
| Company.Create | Create tenants (platform admin) |
| Company.Update | Update company profile |
| Company.Delete | Archive/restore company |
| Company.Settings | Settings, branding, numbering |
| Branch.Manage | Branch CRUD |
| Department.Manage | Department CRUD |
| Designation.Manage | Designation CRUD |
| CostCenter.Manage | Cost center CRUD |
| BusinessUnit.Manage / Region.Manage / Team.Manage | Extended org CRUD |
| ReportingHierarchy.Manage | Reporting lines |

## Document numbering

Templates support tokens:

- `{YYYY}`, `{YY}`, `{MM}`, `{FY}`, `{BRANCH}`

Allocation locks the sequence row (`SELECT … FOR UPDATE`) and resets by calendar year, fiscal year, month, or never.

## Future SaaS extension notes

1. Keep every new aggregate root tenant-scoped with `companyId`
2. Use `CompanyMembership` for consultants/group-company users
3. Prefer shared permission catalog with tenant-scoped roles
4. Store blobs under `{companyId}/…` object keys
5. Never rely on nullable unique indexes for soft-deleted legal identifiers; use partial unique indexes
