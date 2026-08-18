# Construction ERP

Enterprise-grade Construction ERP built as a modular monolith.

## Architecture

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, Redis
- **Storage**: Cloudflare R2
- **Deployment**: Docker Compose

## Folder Structure

```
/apps
  /web       React frontend
  /api       NestJS backend
/docs        Architecture and module documentation
/prisma      Schema, migrations, seed
/docker      Reserved for deployment assets
/packages    Reserved for shared packages
/shared      Reserved for shared contracts
```

## Module docs

- [Company & Organization Module](./COMPANY_ORGANIZATION_MODULE.md)
- [Company API](./API_COMPANY_MODULE.md)
- [Project Lifecycle Module](./PROJECT_LIFECYCLE_MODULE.md)
- [Project API](./API_PROJECT_MODULE.md)
- [ER Diagram](./ER_DIAGRAM.md)
- [Phase 2 Roadmap](./PHASE2_ROADMAP.md)

## Setup

### Prerequisites

- Node.js 20+
- Docker Desktop with Compose
- npm 10+

### Steps

1. Copy `.env.example` to `.env` and set JWT secrets (minimum 32 characters)
2. `npm install`
3. Start infrastructure: `docker compose up -d`
4. Apply schema: `npm run db:migrate:deploy`
5. Seed permissions/roles/admin: `npm run db:seed`
6. Start apps: `npm run dev`

Default bootstrap admin (if configured in `.env`):

- email: `BOOTSTRAP_ADMIN_EMAIL`
- password: `BOOTSTRAP_ADMIN_PASSWORD`

### Scripts

- `npm run dev` — API + web
- `npm run build` — production builds
- `npm run test` — workspace tests
- `npm run db:generate` — Prisma client
- `npm run db:migrate:deploy` — apply migrations
- `npm run db:seed` — seed RBAC and bootstrap admin

### Local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
