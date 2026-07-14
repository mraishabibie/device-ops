# Production Readiness Guide — DeviceOps SaaS

This guide serves as the official operational runbook for deploying, configuring, backing up, and maintaining the DeviceOps SaaS platform in production.

---

## 1. Installation Guide (Local Development Setup)

### System Requirements
*   **Docker:** Engine v20.10+ and Docker Compose v2.0+
*   **Python:** v3.12+ (if running bare metal)
*   **Node.js:** v20+ (if running bare metal)

### Step-by-Step Installation
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/yourorg/deviceops.git
    cd deviceops
    ```
2.  **Configure Environment Variables:**
    Copy the sample configuration file and populate the secrets:
    ```bash
    cp .env.example .env
    ```
3.  **Boot Services with Compose:**
    ```bash
    docker compose up -d
    ```
    This initializes:
    *   **PostgreSQL:** Active relational database on port `5432` with a persistent volume.
    *   **Redis:** Cache and session layer on port `6379`.
    *   **FastAPI API Server:** Listening on port `8000`. Runs migrations on boot.
    *   **Next.js Dashboard:** Listening on port `3000`.

---

## 2. Deployment Guide (Coolify & Production Compose)

### Staging/Production Deployment with Coolify
Coolify is a self-hosted Heroku alternative. To deploy DeviceOps:
1.  **Connect Git Repository:** Point Coolify to your GitHub repository.
2.  **Deploy Backend API (`apps/api`):**
    *   Set the **Base Directory** of the service to `/apps/api`.
    *   Coolify will auto-detect the `Dockerfile`.
    *   Add your production variables (e.g. `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`).
3.  **Deploy Frontend Dashboard (`apps/dashboard`):**
    *   Set the **Base Directory** to `/apps/dashboard`.
    *   Coolify will auto-detect the multi-stage `Dockerfile`.
    *   Add the `NEXT_PUBLIC_API_URL` pointing to your deployed API service URL.

---

## 3. Environment Configuration Guide

The following parameters must be configured in `.env` or injected into your production containers:

| Variable | Description | Security Recommendation | Default / Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection URI | Exclude root password, use SSL. | `postgresql+asyncpg://user:pass@db:5432/deviceops` |
| `REDIS_URL` | Redis caching connection URI | Require password in production. | `redis://redis:6379/0` |
| `JWT_SECRET` | Secret token signing string | Generate random 64-char hex token. | `9a7b...45cf` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token validity time in minutes | Keep low (e.g., 30 mins) for security. | `30` |
| `NEXT_PUBLIC_API_URL` | Public endpoint of the backend API | Must reflect production domain. | `https://api.deviceops.com` |

---

## 4. Backup & Restore Guide

### Automated Database Backup
To perform an online backup of the PostgreSQL database without downtime:
```bash
docker exec -t deviceops-postgres pg_dump -U postgres deviceops > backup_$(date +%F_%H%M%S).sql
```

### Restore Database
To restore a sql dump to a fresh PostgreSQL container instance:
1.  Copy the backup file to your server.
2.  Import the SQL script:
    ```bash
    cat backup_xxxx.sql | docker exec -i deviceops-postgres psql -U postgres -d deviceops
    ```

---

## 5. Security & Maintenance Operations

1.  **CORS Policy:**
    *   In `apps/api/app/main.py`, restrict `allow_origins` to your production frontend URL instead of wildcard `*`.
2.  **JWT Rotations:**
    *   Rotate your `JWT_SECRET` periodically. This instantly revokes all active sessions, requiring users to log in again. Device agents will automatically reconnect and re-authenticate upon their next sync interval.
3.  **Database Index Tuning:**
    *   Indexes on `recorded_at` and `device_id` ensure history scans scale efficiently. Periodically run `ANALYZE` in PostgreSQL to rebuild query plans.
