# Project Lifecycle Management Module

Projects are the central business object of the Construction ERP. Every future operational module (BOQ, Procurement, Inventory, Equipment, Labor, Site Reports, Invoices, Payments, Documents, Approvals, Daily Progress, AI Analysis) must reference `projectId` (+ `companyId` for tenant isolation).

## Architecture

- NestJS module: `apps/api/src/projects`
- Layers: domain repository contracts → application services → Prisma infrastructure → REST controllers/DTOs
- Multi-tenant isolation via `companyId` on every project entity
- Soft deletes with partial unique indexes for active codes
- Document numbering allocates `PROJ-{YYYY}-######` through the existing Document Sequences service
- Audit log entries written for create/update/status/team/budget/timeline/settings changes

## Domain model

```
Company 1──* Project
Project 1──1 ProjectSettings
Project 1──* ProjectPhase 1──* ProjectTask
Project 1──* ProjectMilestone *──* ProjectMilestone (dependencies)
Project 1──* ProjectTeamMember → CompanyMembership
Project 1──* ProjectDocument → FileObject?
Project 1──* ProjectCalendarEvent
Project *──* ProjectTag (via ProjectTagAssignment)
Project *──1 ProjectStatusDefinition (system or company scoped)
Project *──1 ProjectTypeDefinition (system or company scoped)
```

## Lifecycle statuses

Draft, Planning, Tender, Awarded, Mobilization, In Progress, On Hold, Delayed, Completed, Closed, Cancelled, plus `CUSTOM` for company-defined catalogs.

## Permissions

| Code | Purpose |
|------|---------|
| `Project.View` | List/search/details/dashboard/calendar |
| `Project.Create` | Create projects |
| `Project.Edit` | Update project fields, phases, milestones, documents, tags |
| `Project.Delete` | Soft delete / restore |
| `Project.Assign` | Team assignment |
| `Project.Settings` | Project settings and tag catalog writes |
| `Project.Close` | Transition to Closed/Cancelled |
| `Project.Approve` | Reserved for award/approval transitions |

## Default phases on create

Planning, Site Preparation, Foundation, Structure, Block Work, MEP, Finishing, Testing, Handover, Defect Liability (optional via `seedDefaultPhases`).

## Future integration notes

- `clientId`, `consultantId`, `architectId` are UUID placeholders without FKs until CRM/partner modules land
- Dashboard stubs return empty arrays for approvals, material requests, POs, reports, and attendance
- Document metadata supports `fileObjectId` / `externalUrl`; full version control belongs to Documents module
- `defaultWarehouseId` / `defaultStoreId` are ready for Inventory
- Calendar events are local now; Google Calendar sync is reserved
- Geofencing can extend latitude/longitude/area without schema break

## UI routes

- `/companies/:companyId/projects`
- `/companies/:companyId/projects/new`
- `/companies/:companyId/projects/:projectId` (+ dashboard, timeline, phases, milestones, team, documents, calendar, settings)
