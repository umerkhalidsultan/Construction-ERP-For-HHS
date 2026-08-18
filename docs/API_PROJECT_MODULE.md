# Project Lifecycle API

Base path: `/api/v1/companies/:companyId/projects`

All endpoints require Bearer JWT. Permission codes are listed per operation.

## Projects

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/` | `Project.Create` | Create project, allocate `PROJ` code, default settings/phases |
| GET | `/` | `Project.View` | List/search (`search`, `lifecycleStatus`, `projectTypeId`, `projectManagerId`, `clientId`, `city`, `country`, `branchId`, `departmentId`, `tagId`, `minBudget`, `maxBudget`, `includeDeleted`, paging/sort). `search` matches project name/code/short name/city/province/address/contract number |
| GET | `/catalog/statuses` | `Project.View` | System + company statuses |
| GET | `/catalog/types` | `Project.View` | System + company types |
| GET | `/:projectId` | `Project.View` | Project details |
| PATCH | `/:projectId` | `Project.Edit` | Update project |
| DELETE | `/:projectId` | `Project.Delete` | Soft delete |
| POST | `/:projectId/restore` | `Project.Delete` | Restore |
| PATCH | `/:projectId/status` | `Project.Edit` (+ `Project.Close` for CLOSED/CANCELLED) | Status transition |
| GET | `/:projectId/dashboard` | `Project.View` | Progress/budget/risk aggregates |
| GET | `/:projectId/timeline` | `Project.View` | Phases + milestones |

## Phases & tasks

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/:projectId/phases` | View / Edit |
| PATCH/DELETE | `/:projectId/phases/:phaseId` | Edit |
| POST | `/:projectId/phases/:phaseId/tasks` | Edit |
| PATCH/DELETE | `/:projectId/phases/:phaseId/tasks/:taskId` | Edit |

## Milestones

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/:projectId/milestones` | View / Edit |
| PATCH/DELETE | `/:projectId/milestones/:milestoneId` | Edit |
| POST | `/:projectId/milestones/:milestoneId/dependencies` | Edit |
| DELETE | `/:projectId/milestones/:milestoneId/dependencies/:dependencyId` | Edit |

## Team

| Method | Path | Permission |
|--------|------|------------|
| GET | `/:projectId/team` | `Project.View` |
| POST | `/:projectId/team` | `Project.Assign` |
| PATCH/DELETE | `/:projectId/team/:memberId` | `Project.Assign` |

## Documents / calendar / settings / tags

| Method | Path | Permission |
|--------|------|------------|
| GET/POST/PATCH/DELETE | `/:projectId/documents[...]` | View / Edit |
| GET/POST/PATCH/DELETE | `/:projectId/calendar[...]` | View / Edit |
| GET/PATCH | `/:projectId/settings` | View / Settings |
| GET/POST/PATCH/DELETE | `/companies/:companyId/project-tags[...]` | View / Settings |
| POST/DELETE | `/:projectId/tags[...]` | Edit |

## Validation rules

- Unique active `projectCode` per company
- `estimatedBudget > 0`
- `completionPercentage` in `0..100`
- `plannedCompletionDate >= projectStartDate`, enforced on create and on partial `PATCH` updates by cross-checking whichever date is not in the payload against the stored value
- `projectManagerId` required and must be an active membership in the same company
- Closing/cancelling requires `Project.Close`

## Audit actions

Project mutations write dedicated audit actions so history is scannable without diffing payloads: `Project.Create`, `Project.Update`, `Project.BudgetChange` (any of estimated/approved budget, cost, contract value), `Project.TimelineChange` (any of the four lifecycle dates), `Project.LocationChange` (coordinates, address, area, city, province, country), `Project.StatusChange`, `Project.Delete`, `Project.Restore`, plus team/phase/milestone/document/calendar/settings/tag-scoped actions. When an update touches more than one category the priority is budget > timeline > location > generic update.

## Envelope

Success responses use the standard API envelope:

```json
{
  "status": "success",
  "message": "...",
  "data": {},
  "pagination": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 },
  "timestamp": "...",
  "requestId": "..."
}
```
