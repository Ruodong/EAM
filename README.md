# Lenovo EAM (Enterprise Architecture Management)

Enterprise Architecture Management platform for Lenovo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (Turbopack), React 19, TanStack Query, Zustand, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), Python 3.12+ |
| Database | PostgreSQL |

## Project Structure

```
EAM/
├── frontend/          # Next.js 15 app (port 3000)
├── backend/    # FastAPI server (port 4000)
├── api-tests/         # API integration tests (pytest)
├── docs/              # Database schema documentation
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
- `/api/bcpf-master-data` — BC framework master data
- `/api/certifications` — Certification management
- `/api/technology-stack` — Tech stack management
- `/api/dashboard` — Dashboard aggregations
- `/api/health` — Health check

## Prerequisites

- **Node.js** >= 20.x (for frontend)
- **npm** >= 10.x
- **Python** >= 3.12
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
```

Example for local Docker:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/eam_local
DB_SCHEMA=eam
PORT=4000
```

The frontend proxies API requests to the backend via Next.js rewrites (`/api/*` → `http://localhost:4000/api/*`), so no separate frontend env file is needed for development.

## Development

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
npm run dev:frontend    # Next.js 15 + Turbopack on http://localhost:3000
npm run dev:backend     # FastAPI on http://localhost:4000
```

The dev server uses Turbopack with a 4GB Node.js heap limit for stable hot-reload performance.

## Build & Production

```bash
# Build frontend
npm run build

# Start production servers
cd frontend && npm start                    # Next.js production server
cd backend && uvicorn app.main:app   # FastAPI production server
```

## Key Design Decisions

- **Turbopack**: Enabled for dev mode to reduce memory usage and prevent OOM crashes that occurred with Webpack
- **React 19 overrides**: Root `package.json` includes `overrides` for `react` and `react-dom` to prevent dual-version conflicts in the monorepo
- **CMDB integration**: BCM pages use `LEFT JOIN cmdb_application` with `COALESCE(NULLIF(...))` fallback to enrich incomplete `project_app` data
- **All client-side rendering**: Pages use `'use client'` directive — no server components or async params
- **Database schema reference**: The original Prisma schema is preserved in `docs/schema.prisma` for documentation purposes
