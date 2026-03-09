# Lenovo EAM (Enterprise Architecture Management)

Enterprise Architecture Management platform for Lenovo, built with TypeScript monorepo architecture.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (Turbopack), React 19, TanStack Query, Zustand, Tailwind CSS |
| Backend | Express.js, Prisma ORM, TypeScript |
| Database | PostgreSQL |
| Monorepo | npm workspaces |

## Project Structure

```
EAM/
├── frontend/          # Next.js 15 app (port 3000)
├── backend/           # Express API server (port 4000)
├── shared/            # Shared TypeScript types
├── scripts/           # Data migration & seed scripts
└── package.json       # Workspace root
```

### Frontend Modules

| Route | Module |
|-------|--------|
| `/` | Dashboard |
| `/projects` | EA Project Management |
| `/ea-review` | EA Review & Meeting Management |
| `/certification` | Certification Management |
| `/tech-stack` | Technology Stack |
| `/app-management/bcpf` | Business Capability Framework |
| `/app-management/bcm` | Business Capability Mapping (Maintenance) |
| `/app-management/bc-visualization` | Business Capability Analysis |

### Backend API Routes

All routes are prefixed with `/api`. Key endpoints:

- `/api/projects` — EA project CRUD
- `/api/ea-requests` — EA review requests
- `/api/meetings` — Meeting scheduling & minutes
- `/api/applications/bcm` — Business capability mapping
- `/api/applications/bcm/visualization` — BC analysis data
- `/api/bcpf` — BC framework master data
- `/api/certifications` — Certification management
- `/api/technology-stack` — Tech stack management
- `/api/dashboard` — Dashboard aggregations
- `/api/health` — Health check

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** 14+ (local Docker or remote instance)

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

# Install all dependencies (workspaces: frontend, backend, shared)
npm install

# Generate Prisma client
cd backend
npx prisma generate

# Push schema to database (first time setup)
npx prisma db push
cd ..
```

## Configuration

Create `backend/.env`:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>?schema=eam"
```

Example for local Docker:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eam_local?schema=eam"
```

The frontend proxies API requests to the backend via Next.js rewrites (`/api/*` → `http://localhost:4000/api/*`), so no separate frontend env file is needed for development.

## Development

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
npm run dev:frontend    # Next.js 15 + Turbopack on http://localhost:3000
npm run dev:backend     # Express API on http://localhost:4000
```

The dev server uses Turbopack with a 4GB Node.js heap limit for stable hot-reload performance.

## Build & Production

```bash
# Build all packages
npm run build

# Start production servers
cd frontend && npm start    # Next.js production server
cd backend && npm start     # Express production server
```

## Data Seeding

```bash
# Run seed scripts (if available)
npm run seed
```

Migration scripts are located in `scripts/`:
- `extract-apps.js` — Extract application data
- `upsert-apps.sql` — Upsert application records

## Key Design Decisions

- **Turbopack**: Enabled for dev mode to reduce memory usage and prevent OOM crashes that occurred with Webpack
- **React 19 overrides**: Root `package.json` includes `overrides` for `react` and `react-dom` to prevent dual-version conflicts in the monorepo
- **CMDB integration**: BCM pages use `LEFT JOIN cmdb_application` with `COALESCE(NULLIF(...))` fallback to enrich incomplete `project_app` data
- **All client-side rendering**: Pages use `'use client'` directive — no server components or async params
