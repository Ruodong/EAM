# Lenovo EAM (Enterprise Architecture Management)

Enterprise Architecture Management platform for Lenovo — EA review workflow, application portfolio management, business capability analysis, and reporting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (Turbopack), React 19, TanStack Query, Zustand, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), Python 3.12+ |
| Database | PostgreSQL 14+ |
| Auth | Keycloak SSO (JWKS), RBAC (4 roles, 18 resources, 81 endpoints) |
| Testing | pytest (API), Playwright (E2E) |

## Project Structure

```
EAM/
├── frontend/          # Next.js 15 app (port 3000)
│   ├── src/app/       # App Router pages
│   ├── src/components/# UI components + layouts
│   └── src/lib/       # API client, auth, i18n, hooks
├── backend/           # FastAPI server (port 4000)
│   ├── app/routers/   # 23 API router modules
│   ├── app/auth/      # Auth middleware + RBAC
│   └── app/utils/     # Pagination, filters, CSV export
├── api-tests/         # API integration tests (pytest, 201 tests)
├── docs/              # Schema docs + module splitting plan
├── scripts/           # Data migration & seed scripts
└── package.json       # Workspace root
```

## Modules

The system is organized into 5 functional modules + 1 shared support layer:

| Module | Scope | Backend | Frontend |
|--------|-------|---------|----------|
| **A: EA Review** | Review workflow, meetings, actions, calendar | 2,622 lines | ~2,670 lines |
| **B: App Solution** | BCM, CMDB, BCPF, tech stack (CRUD) | ~758 lines | ~1,215 lines |
| **C: Reports** | Dashboard, EA review reports, BC visualization | ~340 lines | ~4,169 lines |
| **D: Auth & Users** | RBAC, SSO, team members, resources | ~890 lines | ~436 lines |
| **E: Config & Data** | Master data, projects, certifications, dict options | 643 lines | ~687 lines |
| **F: Shared Services** | Audit log, export, email log | 731 lines | ~146 lines |

For detailed module boundaries, dependencies, and collaboration guidelines, see [`docs/module-splitting-plan.md`](docs/module-splitting-plan.md).

### Frontend Routes

| Route | Module |
|-------|--------|
| `/` | Dashboard |
| `/projects` | EA Project Management |
| `/ea-review/request-summary` | EA Review Requests |
| `/ea-review/request/[id]` | EA Request Detail & Editing |
| `/ea-review/meetings` | Meeting Management |
| `/ea-review/actions` | Action Items |
| `/ea-review/calendar` | EA Calendar |
| `/certification` | Certification Management |
| `/tech-stack` | Technology Stack |
| `/app-management/bcpf` | Business Capability Framework |
| `/app-management/bcm` | Business Capability Mapping |
| `/app-management/bc-visualization` | BC Analysis & MindMap |
| `/reports/ea-review-dashboard` | EA Review Analytics (6 sub-pages) |
| `/reports/lead-time` | Lead Time Report |
| `/reports/email-log` | Email Log |
| `/settings/*` | Team Members, Audit Log, Scope Config |

### Backend API Routes

All routes are prefixed with `/api`. 23 router modules, 81 endpoints:

| Endpoint | Description |
|----------|-------------|
| `/api/auth/me`, `/api/auth/permissions` | Current user & permission list |
| `/api/ea-requests` | EA review request lifecycle |
| `/api/meetings` | Meeting scheduling & minutes |
| `/api/actions` | Action items tracking |
| `/api/schedules` | EA calendar & scheduling |
| `/api/scope` | Scope of change management |
| `/api/meeting-decks` | Meeting deck uploads |
| `/api/projects` | EA project CRUD |
| `/api/applications/bcm` | Business capability mapping |
| `/api/applications/bcm/visualization` | BC analysis data |
| `/api/bcpf-master-data` | BC framework master data |
| `/api/cmdb-applications` | CMDB application data |
| `/api/certifications` | Certification management |
| `/api/technology-stack` | Tech stack management |
| `/api/master-data` | Master data options |
| `/api/dict-options` | Dictionary option values |
| `/api/team-members` | Team member management |
| `/api/resources` | Resource pool |
| `/api/dashboard` | Dashboard aggregations |
| `/api/reports` | Report data |
| `/api/export/:entity` | CSV export (all entities) |
| `/api/audit-log` | Audit log queries |
| `/api/health` | Health check |

## Authentication & Authorization

The system uses a pluggable auth architecture with RBAC:

```
AUTH_DISABLED=true  -> DevAuthProvider  (fixed dev_admin user, for local dev)
AUTH_DISABLED=false -> KeycloakAuthProvider (JWKS signature verification, for production)
                       |
                AuthMiddleware -> request.state.user
                       |
                Depends(require_permission("resource", "scope"))
```

**RBAC Roles:**

| Role | Description |
|------|-------------|
| `admin` | Full access (`*:*`) |
| `ea_reviewer` | Review workflow read/write, others read-only |
| `editor` | Data maintenance read/write, review read-only |
| `viewer` | Read-only |

All 81 API endpoints are protected via `Depends(require_permission(...))` with zero business code intrusion. Frontend uses `<PermissionGate>` component and `usePermission()` hook for conditional rendering.

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Python** >= 3.12
- **PostgreSQL** 14+

## Database Setup

### Option A: Local Docker PostgreSQL

```bash
docker run -d \
  --name ea-mvp-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=eam_local \
  -p 5432:5432 \
  postgres:16
```

Create the schema:

```sql
CREATE SCHEMA IF NOT EXISTS eam;
```

### Option B: Remote PostgreSQL

Configure the connection string in `backend/.env` pointing to your remote instance.

## Installation

```bash
# Clone the repository
git clone https://github.com/Ruodong/EAM.git
cd EAM

# Install frontend dependencies
npm install

# Set up Python backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

## Configuration

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:<port>/<database>
DB_SCHEMA=eam
PORT=4000

# Auth — REQUIRED for local development (disables Keycloak JWT verification)
AUTH_DISABLED=true
```

Example for local Docker:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/eam_local
DB_SCHEMA=eam
PORT=4000
AUTH_DISABLED=true
```

> **Security:** `AUTH_DISABLED` defaults to `false`. You **must** set `AUTH_DISABLED=true` explicitly in your `.env` for local development. Never set this in production — production deployments must configure the Keycloak variables below instead.

For production / staging, configure Keycloak SSO:

```env
AUTH_DISABLED=false
KEYCLOAK_SERVER_URL=https://your-keycloak-server/
KEYCLOAK_REALM=myapp
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

The frontend proxies API requests to the backend via Next.js rewrites (`/api/*` -> `http://localhost:4000/api/*`), so no separate frontend env file is needed for development.

## Development

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
npm run dev:frontend    # Next.js 15 + Turbopack on http://localhost:3000
npm run dev:backend     # FastAPI on http://localhost:4000
```

API documentation is auto-generated at `http://localhost:4000/docs` (Swagger UI).

## Testing

```bash
# API integration tests (201 tests across 19 modules)
cd api-tests
source venv/bin/activate
pytest

# Frontend build check
cd frontend && npm run build

# Playwright E2E tests (4 specs: BCM, CMDB, BCPF, BC Visualization)
cd frontend && npx playwright test
```

## Build & Production

```bash
# Build frontend
npm run build

# Start production servers
cd frontend && npm start                    # Next.js production server
cd backend && uvicorn app.main:app          # FastAPI production server
```

## Key Design Decisions

- **Turbopack**: Enabled for dev mode to reduce memory usage and prevent OOM crashes that occurred with Webpack
- **React 19 overrides**: Root `package.json` includes `overrides` for `react` and `react-dom` to prevent dual-version conflicts in the monorepo
- **CMDB integration**: BCM pages use `LEFT JOIN cmdb_application` with `COALESCE(NULLIF(...))` fallback to enrich incomplete `project_app` data
- **All client-side rendering**: Pages use `'use client'` directive — no server components or async params
- **Raw SQL over ORM**: Backend uses `text()` SQL directly for performance and migration simplicity; Pydantic schemas planned as next improvement
- **Auth zero-intrusion**: RBAC integrated via FastAPI `Depends()` — no business logic changes needed per endpoint
- **Database schema reference**: The original Prisma schema is preserved in `docs/schema.prisma` for documentation purposes
