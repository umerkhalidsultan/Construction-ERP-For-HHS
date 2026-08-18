# CRM / Leads Foundation

## Scope

This phase implements lead management only. Opportunities, tenders, estimation,
BOQ integration, project conversion, accounting integration, and forecasting are
intentionally excluded.

## Reused ERP foundations

- `Company` is the tenant boundary; every lead query includes `companyId`.
- `CompanyMembership` is the assignee identity.
- `DocumentSequence` allocates yearly `LEAD-{YYYY}-######` numbers inside the
  lead-creation transaction.
- `FileObject` remains the storage record; lead attachments reference an
  available file in the same company.
- `AuditLog` provides the lead timeline and records important mutations.
- Existing JWT, permissions guard, validation pipe, exception filter, response
  interceptor, React Query client, and UI components are reused.

No Client, Customer, Contact, or Currency master exists in the current schema.
Prospective organization/contact details therefore remain lead fields until the
dedicated party master is implemented. Currency follows the existing ISO
three-letter company default convention.

## Data model

- `LeadTypeDefinition`: global system values plus future company-defined values.
- `LeadSourceDefinition`: global system values plus future company-defined values.
- `Lead`: tenant-owned lead, exact `Decimal(18,2)` value, controlled status and
  priority, optional location coordinates, assignee, and activity timestamp.
- `LeadNote`: internal, auditable notes with soft deletion.
- `LeadAttachment`: tenant-safe association to the existing `FileObject`.

Indexes cover tenant/status, assignee/status, type, source, expected close,
name, email, and phone. Lead number is unique per company.

## API

Base path: `/api/v1/companies/:companyId/crm/leads`

- `GET /` — paginated search/filter/sort register
- `POST /` — create lead and allocate number
- `GET /dashboard` — status KPIs and active estimated pipeline value
- `GET /catalog` — type/source/status catalog and company currency
- `GET /assignees` — active CRM-authorized company memberships
- `GET /duplicate-check` — possible matches for review
- `GET /:leadId` — details, notes, and attachments
- `PATCH /:leadId` — edit lead fields
- `DELETE /:leadId` — soft-delete lead
- `PATCH /:leadId/assignment` — assign or unassign
- `PATCH /:leadId/status` — controlled status transition
- `POST /:leadId/notes` — add internal note
- `PATCH /:leadId/notes/:noteId` — edit note
- `DELETE /:leadId/notes/:noteId` — soft-delete note
- `POST /:leadId/attachments` — associate an existing company file
- `GET /:leadId/timeline` — chronological audit events

## Permissions

- `CRM.View`
- `CRM.Lead.View`
- `CRM.Lead.Create`
- `CRM.Lead.Edit`
- `CRM.Lead.Delete`
- `CRM.Lead.Assign`
- `CRM.Lead.ChangeStatus`
- `CRM.Lead.Export`

System roles `Business Development Manager` and `Business Development Executive`
are seeded. Company Admin, Super Admin, and Director inherit the applicable CRM
permissions from the existing role seeding rules.

## Duplicate review

Possible matches are tenant-scoped and checked using normalized phone plus exact,
case-insensitive email, organization name, and contact name. Matches are shown to
the user instead of being silently rejected. Create/edit requires an explicit
`overrideDuplicate` decision to continue when matches exist.

## UI

Routes:

- `/companies/:companyId/crm/leads`
- `/companies/:companyId/crm/leads/new`
- `/companies/:companyId/crm/leads/:leadId`
- `/companies/:companyId/crm/leads/:leadId/edit`

Desktop uses a server-backed table. Narrow screens use cards without a wide
table, and forms/actions stack for tablet and Android browser widths.

## Phase limitations

- Binary upload is not duplicated in CRM. The attachment endpoint associates an
  existing, available `FileObject`; a general document-upload UI can be added to
  the shared storage module later.
- The database supports tenant-defined lead type/source values, but their admin
  configuration screen is deferred as requested (“later”).
- `CONVERTED` is a controlled terminal lead status only; it does not create a
  Project in this phase.
- Native Android code is not present in this repository. The web experience is
  responsive for Android browsers.
