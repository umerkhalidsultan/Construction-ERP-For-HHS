# CRM Companies & Contacts

## Domain boundary

`Company` remains the ERP tenant/organization. `CrmCompany` represents an
external business party inside that tenant: client, developer, consultant,
supplier, contractor, or another commercial relationship. This naming prevents
tenant records from being confused with CRM master data.

## Relationships

- `CrmCompany` has many contacts.
- `CrmContact.crmCompanyId` is optional, supporting individual property owners
  and other independent contacts.
- Company and contact types use definition plus assignment tables, allowing
  multiple simultaneous roles.
- `CrmCompanyPrimaryContact` identifies one contact per purpose: business,
  accounts, technical, procurement, or other.
- `mergedIntoId` self-relations prepare both masters for a future controlled
  merge workflow. This phase does not execute merges or delete relationships.
- Notes and attachments are tenant-owned. Attachments reuse `FileObject`.

## Lead migration and integration

Optional tenant-safe `crmCompanyId` and `crmContactId` foreign keys were added to
`Lead`, together with `partyLinkStatus`. Existing `organizationName`,
`contactPerson`, phone, email, and address snapshot fields are preserved.

No automatic backfill is performed. Existing leads remain `UNLINKED`. A future
review tool can propose matches and mark uncertain records `REVIEW_REQUIRED`.
Authorized users can link a verified company/contact through the Lead form or
`PATCH /api/v1/companies/:companyId/crm/leads/:leadId/parties`.

## API

Base: `/api/v1/companies/:companyId/crm`

- `GET /search` — tenant-wide company/contact search
- `GET /catalog`, `GET /assignees`
- Company list/create/details/update/archive, assignment, duplicate check,
  primary contacts, notes, attachments, and timeline under `/companies`
- Contact list/create/details/update/archive, assignment, company link/unlink,
  duplicate check, notes, attachments, and timeline under `/contacts`
- `PATCH /leads/:leadId/parties` — verified Lead linkage

All list endpoints are server-paginated, filterable and sortable.

## Security

- JWT and existing permission guards protect controllers.
- Every repository query includes the route tenant ID.
- Company/contact/type/assignee/file IDs are revalidated server-side.
- DTO whitelisting rejects tenant IDs and unknown mass-assignment fields.
- Assignment and Lead linking use dedicated permissioned endpoints.
- Registration and tax numbers have tenant-level unique database constraints.
- Global error filtering prevents ORM, SQL, stack and internal error disclosure.

## Deferred scope

- Merge execution and merge conflict resolution
- Company-to-company relationship graph
- CSV/Excel import and export engines
- Opportunities, tenders, contracts, projects and advanced marketing automation
- A shared binary document uploader; CRM currently links existing secure files
