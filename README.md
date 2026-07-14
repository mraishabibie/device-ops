# DeviceOps SaaS

DeviceOps is a lightweight, cloud-based B2B SaaS platform that enables companies to monitor the operational status of company-owned Android devices from a centralized web dashboard. 

> [!IMPORTANT]
> **Scope boundary:** DeviceOps focuses strictly on operational visibility (GPS, battery, network connectivity, synchronization status). It is **NOT** a Mobile Device Management (MDM) platform, and explicitly excludes remote policies or remote controls.

---

## 1. System Architecture

The platform follows a clean, three-tier architecture:
1. **Android Client Agent (`apps/agent/`):** Built in Kotlin for Android 11+ (API 26+). Operates as a background service managed via `WorkManager` for service resilience. Collects GPS coordinates, battery level, charging state, and network status every 30 minutes. Caches telemetry logs locally in a `Room` database and uploads them to the server via Retrofit HTTPS REST APIs.
2. **FastAPI Backend (`apps/api/`):** Async Python 3.13+ web backend powered by FastAPI, SQLAlchemy 2.x, Pydantic v2, and Alembic. Exposes secure JSON REST endpoints under JWT authentication. Validates multi-tenant isolation rules by filtering queries based on the authenticated client's `company_id`. Redis is incorporated for rate limiting and session verification.
3. **Next.js Dashboard (`apps/dashboard/`):** Desktop-first Next.js App Router UI in TypeScript styled with Tailwind CSS and `shadcn/ui` primitives. It uses `MapLibre` for geospatial rendering and `Recharts` for telemetry history visualization.

---

## 2. Project Directory Structure

This project is organized as a monorepo containing all components:

```
deviceops/
├── apps/
│   ├── api/                 # FastAPI Backend Service
│   │   ├── alembic/         # Database migrations
│   │   ├── app/
│   │   │   ├── api/         # Routes, endpoints, middleware, and dependencies
│   │   │   ├── core/        # Settings, DB, Redis, and logger configs
│   │   │   ├── models/      # SQLAlchemy ORM models
│   │   │   ├── schemas/     # Pydantic v2 validation models
│   │   │   ├── repositories/# Database interaction layer
│   │   │   └── services/    # Business services
│   │   ├── pyproject.toml   # uv project dependencies
│   │   └── Dockerfile       # Production docker instructions
│   │
│   ├── dashboard/           # Next.js Frontend Dashboard
│   │   ├── src/
│   │   │   ├── app/         # Next.js App Router pages and layouts
│   │   │   ├── components/  # Reusable UI primitives (shadcn/ui)
│   │   │   ├── features/    # Domain-specific components, hooks, services, and types
│   │   │   └── lib/         # Configuration and utility helpers
│   │   ├── package.json     # Node packages
│   │   └── Dockerfile       # Node production build instructions
│   │
│   └── agent/               # Kotlin Android Agent client
│       ├── app/
│       │   ├── src/main/    # Android manifest, resources, assets
│       │   │   └── java/com/deviceops/agent/
│       │   │       ├── data/# Local Room DB and remote API interfaces
│       │   │       ├── domain/# Domain entities
│       │   │       ├── ui/  # Views and ViewModels (MVVM)
│       │   │       └── worker/# Background jobs and services
│       │   └── build.gradle.kts
│       └── build.gradle.kts # Project-level configuration
│
├── docker-compose.yml       # Development orchestration
├── .gitignore               # Monorepo git ignore settings
└── README.md                # General readme
```

---

## 3. Local Setup Instructions

### Prerequisites
* [Docker & Docker Compose](https://docs.docker.com/engine/install/)
* [Node.js LTS (v20+)](https://nodejs.org/)
* [Python 3.13+](https://www.python.org/)
* [uv Package Manager](https://github.com/astral-sh/uv)
* Android Studio (Koala or later recommended) for building the Android client

### Running the Whole System with Docker
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Build and start the containers:
   ```bash
   docker compose up --build
   ```
3. The dashboard will be available at `http://localhost:3000` and the backend Swagger documentation at `http://localhost:8000/docs`.

### Individual Components Setup

#### Backend (FastAPI)
1. Navigate to the API folder:
   ```bash
   cd apps/api
   ```
2. Create virtual environment and install dependencies:
   ```bash
   uv venv
   uv pip install -e .
   ```
3. Run migrations (requires PostgreSQL):
   ```bash
   uv run alembic upgrade head
   ```
4. Start development server:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```

#### Dashboard (Next.js)
1. Navigate to the dashboard folder:
   ```bash
   cd apps/dashboard
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start local development server:
   ```bash
   npm run dev
   ```

---

## 5. Production Readiness & Deployment

For deployment guides, environment variable descriptions, docker optimizations, backup manuals, and staging scripts, please consult the [Production Readiness Guide](file:///d:/Project/deviceops/docs/09_Production_Readiness_DeviceOps_SaaS.md).

---

## 6. Development Workflow & Git Rules

* **Branching Model:** Keep all development on the `develop` branch. Split features into `feature/<name>` and fixes into `bugfix/<issue>`. Pull requests must be verified before merging into `main`.
* **Commit Conventions:** Follow semantic prefix styles:
  * `feat:` new business modules or capabilities
  * `fix:` bug fixes and validations
  * `refactor:` code restructuring without feature changes
  * `docs:` updates to project document files
  * `chore:` packages updates, gradle updates, docker modifications
* **Clean Code Guidelines:** Solid principles, async-first endpoints for API, feature-based files organization on Next.js, MVVM design on Android.