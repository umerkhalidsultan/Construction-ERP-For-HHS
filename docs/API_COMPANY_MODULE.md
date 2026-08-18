# Company Module API Documentation

Swagger UI: `http://localhost:3000/api/docs`

All responses use:

```json
{
  "status": "success|error",
  "message": "string",
  "data": {},
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  },
  "timestamp": "ISO-8601",
  "requestId": "uuid"
}
```

## Authentication

### `POST /api/v1/auth/login`

Body:

```json
{
  "email": "admin@hhs.local",
  "password": "ChangeMeNow!123",
  "companyId": "optional-uuid"
}
```

Returns access token and sets httpOnly refresh cookie `erp_refresh_token`.

### `POST /api/v1/auth/refresh`

Rotates refresh session and returns a new access token.

### `POST /api/v1/auth/logout`

Revokes the current refresh session.

## Companies

| Method | Path | Permission |
|--------|------|------------|
| POST | `/companies` | Company.Create |
| GET | `/companies` | Company.View |
| GET | `/companies/:companyId` | Company.View |
| PATCH | `/companies/:companyId` | Company.Update |
| DELETE | `/companies/:companyId` | Company.Delete |
| POST | `/companies/:companyId/restore` | Company.Delete |
| GET | `/companies/:companyId/dashboard` | Company.View |
| GET/PATCH | `/companies/:companyId/settings` | Company.Settings |
| GET/PATCH | `/companies/:companyId/branding` | Company.View / Company.Settings |
| POST | `/companies/:companyId/branding/assets/:purpose` | Company.Settings |

Brand asset purposes:

`COMPANY_LOGO`, `FAVICON`, `REPORT_HEADER`, `REPORT_FOOTER`, `EMAIL_LOGO`, `WATERMARK`

## Organization

CRUD endpoints exist for:

- `/companies/:companyId/branches`
- `/companies/:companyId/departments`
- `/companies/:companyId/designations`
- `/companies/:companyId/cost-centers`
- `/companies/:companyId/organization/business-units`
- `/companies/:companyId/organization/regions`
- `/companies/:companyId/organization/teams`
- `/companies/:companyId/organization/reporting-lines`
- `/companies/:companyId/organization/chart`

## Document numbering

| Method | Path |
|--------|------|
| GET | `/companies/:companyId/document-sequences` |
| POST | `/companies/:companyId/document-sequences` |
| PATCH | `/companies/:companyId/document-sequences/:sequenceId` |
| DELETE | `/companies/:companyId/document-sequences/:sequenceId` |
| POST | `/companies/:companyId/document-sequences/allocate` |

Allocate body:

```json
{
  "documentType": "PO",
  "branchId": "optional-uuid"
}
```
