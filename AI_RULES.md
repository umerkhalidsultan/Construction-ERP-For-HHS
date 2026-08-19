# HHS Construction ERP — AI Development Rules

> **AI CODING AGENTS: Read this file before modifying the project. These rules are mandatory.**

## 1. Work From the Existing System
- Inspect the relevant code before editing.
- Read `ARCHITECTURE.md` and `PROJECT_STATUS.md`.
- Reuse existing patterns, entities, services, components, and utilities.
- Do not rebuild working features or create duplicate systems.
- Make the smallest safe change required.
- Do not modify unrelated modules or perform uncontrolled refactors.
- Do not add dependencies unless clearly necessary.
- Never assume a planned feature is already implemented.

## 2. Preserve Architecture
- Follow the repository's actual frontend, backend, database, API, and naming conventions.
- Do not change frameworks, authentication, ORM, database strategy, or core architecture without explicit approval.
- Check existing implementation before creating a new table, endpoint, service, context, store, hook, or component.

## 3. Database & Data Integrity
- Use migrations for schema changes.
- Never delete or reset real data to solve a development problem.
- Use foreign keys, constraints, transactions, and indexes where appropriate.
- Use exact decimal/numeric types for money; never floating-point arithmetic for financial values.
- Prevent duplicate records and partial writes.
- Never expose database credentials, schema errors, SQL errors, or ORM errors to users.

## 4. Authentication, RBAC & Company/Tenant Security
- Never bypass authentication or authorization to make a feature work.
- Enforce permissions on the backend; hiding UI controls is not security.
- Never trust `userId`, `roleId`, `companyId`, `organizationId`, tenant IDs, or permissions supplied by the frontend.
- Verify selected/active company access server-side.
- Never allow one company/tenant to access another company's data.
- Do not create a second authentication, RBAC, company-context, or tenant system.

## 5. API & Validation
Every protected API must:
- Authenticate.
- Authorize.
- Validate and sanitize input.
- Enforce company/tenant scope.
- Enforce business rules.
- Return the project's standard response/error format.

Validate on the backend even when frontend validation exists.

## 6. Error Handling
Use the centralized error-handling system everywhere.

Users must never see:
- Stack traces.
- SQL/ORM errors.
- Internal paths.
- Environment variables.
- Tokens or secrets.
- Raw technical exceptions.

Show clear field-level errors when possible and professional user-facing messages otherwise. Log technical details securely.

## 7. Security
Protect against:
- SQL injection.
- XSS.
- CSRF where applicable.
- IDOR.
- Mass assignment.
- Privilege escalation.
- Authentication/authorization bypass.
- Cross-tenant access.
- Insecure uploads.
- Secret/token leakage.

Never weaken security as a shortcut.

## 8. Construction & Financial Business Rules
- Keep features construction-business focused.
- Preserve auditability for approvals, contracts, procurement, BOQ, projects, HR, inventory, and accounting.
- Never silently alter posted financial transactions.
- Use transactions for multi-step financial/data operations.
- Prefer reversal/correction workflows over destructive deletion where required.

## 9. UI/UX
- Follow the existing design system and reusable components.
- Keep validation, dialogs, notifications, loading, empty, and error states consistent.
- Support desktop, tablet, and Android-responsive layouts.
- Avoid horizontal overflow and one-off UI patterns.
- Do not redesign unrelated screens while implementing a feature.

## 10. Change Discipline
Before coding:
1. Read these rules, `ARCHITECTURE.md`, and `PROJECT_STATUS.md`.
2. Inspect the relevant implementation and dependencies.
3. Identify the root cause or required scope.
4. Reuse existing architecture.

During coding:
1. Modify only necessary files.
2. Preserve backward compatibility where practical.
3. Do not hide errors with workarounds.
4. Do not hardcode IDs, credentials, ports, permissions, company context, or environment-specific values.

After coding:
1. Test the main workflow and invalid cases.
2. Test authorization and tenant isolation where relevant.
3. Run typecheck, lint, tests, and production build where available.
4. Fix issues introduced by the change.
5. Update `PROJECT_STATUS.md` when project status materially changes.
6. Report the root cause/implementation, files changed, migrations, tests, and remaining limitations.

## 11. Stop at Scope
Complete only the requested task or module. Do not automatically start the next module.

## 12. When Uncertain
Do not guess. Inspect the code/configuration first. If uncertainty remains, report it clearly instead of inventing architecture or behavior.

## GITHUB
After completing and testing a task, commit and push only the intended changes to the correct branch. Never push broken code, secrets, .env files, generated credentials, or unrelated changes.