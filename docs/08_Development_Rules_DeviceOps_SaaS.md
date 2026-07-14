# Development Rules

**Project:** DeviceOps SaaS  
**Version:** 1.0 (MVP)

---

# 1. Purpose

This document defines the mandatory development standards for the DeviceOps SaaS project.

All generated code must comply with these rules.

---

# 2. General Principles

- Follow the PRD, Database Design, SRS, and Functional Requirements.
- Do not implement features outside the approved MVP.
- Prioritize readability over clever code.
- Keep modules small and maintainable.
- Avoid unnecessary dependencies.

---

# 3. Project Architecture

Monorepo Structure

```
deviceops/

apps/
    dashboard/
    api/
    agent/

docs/

docker/
```

---

# 4. Frontend Standards

Framework

- Next.js (App Router)
- TypeScript (Strict Mode)

UI

- Tailwind CSS only
- shadcn/ui only
- Lucide Icons
- MapLibre
- Recharts

Rules

- No inline CSS
- Reusable components
- Server Components by default
- Client Components only when necessary

Folder Example

```
app/
components/
lib/
hooks/
types/
```

---

# 5. Backend Standards

Framework

- FastAPI

Language

- Python 3.13+

Database

- PostgreSQL

ORM

- SQLAlchemy 2.x

Validation

- Pydantic v2

Rules

- Type hints required
- Async endpoints
- Repository + Service pattern
- RESTful APIs
- UTC timestamps
- UUID primary keys
- No raw SQL unless required

Folder Example

```
app/
    api/
    services/
    repositories/
    models/
    schemas/
    core/
```

---

# 6. Android Agent Standards

Language

- Kotlin

Architecture

- MVVM

Libraries

- WorkManager
- Retrofit
- Room
- Coroutines

Rules

- Lightweight UI
- Business logic outside Activity
- Offline-first
- Background synchronization every 30 minutes
- Minimize battery usage

---

# 7. API Standards

Request

- JSON only

Response Format

```json
{
  "success": true,
  "message": "Request completed.",
  "data": {}
}
```

Error Format

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

HTTP Status Codes

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Validation Error
- 500 Internal Server Error

---

# 8. Database Rules

- UUID primary keys
- snake_case naming
- UTC timestamps
- Foreign keys enforced
- Soft delete for master tables (permanent deletes only; account disabling must use the user status column)
- Immutable log tables
- Every business table includes company_id

---

# 9. Security Rules

- HTTPS only
- JWT Authentication
- Refresh Token
- Argon2 password hashing
- Environment variables for secrets
- Parameterized queries
- Input validation
- Company isolation on every request
- QR tokens expire automatically

---

# 10. Logging

Log the following events:

- Login
- Logout
- Device Pairing
- Synchronization
- API Errors
- Server Exceptions

Do not log passwords or sensitive tokens.

---

# 11. Git Rules

Main Branch

- main

Development Branch

- develop

Feature Branch

```
feature/<feature-name>
```

Bug Fix

```
bugfix/<issue-name>
```

Commit Style

```
feat:
fix:
refactor:
docs:
test:
chore:
```

---

# 12. Docker Rules

All services must run in Docker.

Required Containers

- dashboard
- api
- postgres
- redis

Development and production must use the same Docker configuration where possible.

---

# 13. Code Quality

- Follow SOLID principles
- Keep functions focused
- Avoid duplicate logic
- Write meaningful variable names
- Remove dead code
- No commented production code

---

# 14. Testing Rules

Backend

- Unit Tests
- Integration Tests

Frontend

- Component Tests
- Page Validation

Android

- Functional Testing
- Background Sync Testing

Manual Validation

- QR Pairing
- GPS Collection
- Battery Collection
- Network Collection
- Offline Synchronization

---

# 15. Deployment Rules

Deployment Target

- Ubuntu VPS
- Docker Compose
- Coolify

Deployment Process

Git Push

↓

Coolify Build

↓

Container Deployment

↓

Health Check

↓

Production Ready

---

# 16. AI Development Rules

All generated code must:

- Follow project architecture.
- Reuse existing components.
- Avoid unnecessary abstractions.
- Never change database schema without approval.
- Never introduce additional frameworks.
- Keep implementation consistent with project documentation.

---

# 17. Definition of Success

Development is successful when:

- Documentation and implementation match.
- Code is readable and maintainable.
- All tests pass.
- Docker deployment succeeds.
- Coolify deployment succeeds.
- The application is production-ready.
