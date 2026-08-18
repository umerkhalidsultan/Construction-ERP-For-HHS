# ERP ER Diagram

## Company & Organization

```mermaid
erDiagram
  Company ||--o| CompanySettings : has
  Company ||--o| CompanyBranding : has
  Company ||--o{ CompanyMembership : employs
  Company ||--o{ Branch : operates
  Company ||--o{ Department : organizes
  Company ||--o{ Designation : defines
  Company ||--o{ CostCenter : allocates
  Company ||--o{ BusinessUnit : groups
  Company ||--o{ Region : covers
  Company ||--o{ Team : staffs
  Company ||--o{ ReportingLine : hierarchy
  Company ||--o{ DocumentSequence : numbers
  Company ||--o{ FileObject : stores
  Company ||--o{ Role : scopes
  Company ||--o{ AuditLog : audits

  User ||--o{ CompanyMembership : joins
  User ||--o{ Session : authenticates
  User ||--o{ AuditLog : performs

  CompanyMembership }o--o{ Role : MembershipRole
  Role }o--o{ Permission : RolePermission

  Branch }o--|| CompanyMembership : manager
  Department }o--|| CompanyMembership : head
  Team }o--|| CompanyMembership : lead
  CostCenter }o--|| CompanyMembership : manager

  Department ||--o{ Department : parent
  CostCenter ||--o{ CostCenter : parent
  ReportingLine }o--|| CompanyMembership : subordinate
  ReportingLine }o--|| CompanyMembership : manager

  CompanyBranding }o--|| FileObject : logo
  DocumentSequence }o--o| Branch : optionalScope
```

## Project Lifecycle

```mermaid
erDiagram
  Company ||--o{ Project : owns
  Company ||--o{ ProjectTag : catalogs
  Company ||--o{ ProjectStatusDefinition : customizes
  Company ||--o{ ProjectTypeDefinition : customizes

  ProjectStatusDefinition ||--o{ Project : status
  ProjectTypeDefinition ||--o{ Project : type
  ProjectTypeDefinition ||--o{ Project : constructionType

  CompanyMembership ||--o{ Project : manages
  CompanyMembership ||--o{ Project : siteEngineer
  Branch ||--o{ Project : hosts
  Department ||--o{ Project : ownsCost

  Project ||--o| ProjectSettings : configures
  Project ||--o{ ProjectPhase : phases
  Project ||--o{ ProjectMilestone : milestones
  Project ||--o{ ProjectTeamMember : staffs
  Project ||--o{ ProjectDocument : documents
  Project ||--o{ ProjectCalendarEvent : schedules
  Project ||--o{ ProjectTagAssignment : tagged

  ProjectPhase ||--o{ ProjectTask : tasks
  ProjectPhase ||--o{ ProjectMilestone : contains
  ProjectPhase ||--o{ ProjectDocument : phaseDocs
  ProjectMilestone ||--o{ ProjectMilestoneDependency : dependsOn
  ProjectMilestone ||--o{ ProjectCalendarEvent : marks
  ProjectTag ||--o{ ProjectTagAssignment : assigned
  FileObject ||--o{ ProjectDocument : stores
  CompanyMembership ||--o{ ProjectTeamMember : assigned
  CompanyMembership ||--o{ ProjectTask : assignee
```

## Isolation invariants

- Membership and org FKs are composite on `(entityId, companyId)`
- Project child FKs are composite on `(projectId|phaseId|milestoneId, companyId)`
- Soft-deleted legal numbers and project codes can be reused through partial unique indexes
- Platform administrators may operate without a company context; tenant users may not
- Future BOQ/Procurement/Inventory rows must include `(companyId, projectId)` from day one
