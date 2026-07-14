# Database Design

**Project:** DeviceOps SaaS  
**Version:** 1.0 (MVP)

---

# 1. Overview

Database Engine: PostgreSQL

Architecture: Multi-Tenant SaaS

Every record belongs to exactly one company through `company_id`.

All application queries must always filter by `company_id`.

Primary Key Strategy:
- UUID for all primary keys.

Audit Fields:
- created_at
- updated_at
- deleted_at (soft delete where applicable)

Timezone:
- UTC

---

# 2. Entity Relationship

```
Company
 ├── Users
 ├── Devices
 │     ├── GPS Logs
 │     ├── Battery Logs
 │     └── Network Logs
 └── Pairing Tokens
```

---

# 3. Tables

## companies

Purpose:
Store tenant information.

| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE |
| status | VARCHAR(20) | ACTIVE/SUSPENDED |
| contact_email | VARCHAR(150) | NULL |
| website | VARCHAR(150) | NULL |
| support_phone | VARCHAR(50) | NULL |
| logo_url | VARCHAR(255) | NULL |
| timezone | VARCHAR(100) | NOT NULL |
| date_format | VARCHAR(30) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |
| deleted_at | TIMESTAMP | NULL |

Indexes:
- slug
- status

---

## users

Purpose:
Dashboard users.

| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| company_id | UUID | FK |
| full_name | VARCHAR(150) | NOT NULL |
| email | VARCHAR(150) | UNIQUE |
| password_hash | TEXT | NOT NULL |
| role | VARCHAR(20) | OWNER/ADMIN/VIEWER |
| status | VARCHAR(20) | ACTIVE/DISABLED |
| last_login_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |
| deleted_at | TIMESTAMP | NULL |

Indexes:
- company_id
- email
- status

Business Rules:
- User status can be ACTIVE or DISABLED. Disabling accounts changes this column and must not soft delete the user record.
- Soft delete via `deleted_at` is reserved only for permanent deletion of the user.

---

## devices

Purpose:
Registered Android devices.

| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| company_id | UUID | FK |
| device_name | VARCHAR(100) | NOT NULL |
| serial_number | VARCHAR(150) | UNIQUE |
| android_version | VARCHAR(30) | NULL |
| app_version | VARCHAR(30) | NULL |
| department | VARCHAR(100) | NULL |
| device_type | VARCHAR(20) | PHONE/TABLET |
| pairing_status | VARCHAR(20) | PAIRED/UNPAIRED |
| status | VARCHAR(20) | ONLINE/OFFLINE/PENDING_SYNC |
| last_sync_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |
| deleted_at | TIMESTAMP | NULL |

Indexes:
- company_id
- pairing_status
- status
- last_sync_at

---

## pairing_tokens

Purpose:
One-time QR pairing.

| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| company_id | UUID | FK |
| device_id | UUID | FK |
| token | VARCHAR(255) | UNIQUE |
| expires_at | TIMESTAMP | NOT NULL |
| used_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |

Indexes:
- token

Business Rules:
- One token = one pairing.
- Expired tokens cannot be reused.

---

## gps_logs

Purpose:
Store device locations.

| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| company_id | UUID | FK |
| device_id | UUID | FK |
| latitude | DECIMAL(10,7) | NOT NULL |
| longitude | DECIMAL(10,7) | NOT NULL |
| accuracy | DECIMAL(5,2) | NULL |
| recorded_at | TIMESTAMP | NOT NULL |
| synced_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |

Indexes:
- company_id
- device_id
- recorded_at
- (device_id, recorded_at)

---

## battery_logs

Purpose:
Store battery history.

| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| company_id | UUID | FK |
| device_id | UUID | FK |
| battery_level | SMALLINT | 0-100 |
| charging | BOOLEAN | NOT NULL |
| recorded_at | TIMESTAMP | NOT NULL |
| synced_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |

Indexes:
- device_id
- recorded_at

---

## network_logs

Purpose:
Store connectivity status.

| Column | Type | Constraint |
|--------|------|------------|
| id | UUID | PK |
| company_id | UUID | FK |
| device_id | UUID | FK |
| network_type | VARCHAR(20) | WIFI/CELLULAR/OFFLINE |
| is_online | BOOLEAN | NOT NULL |
| recorded_at | TIMESTAMP | NOT NULL |
| synced_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | NOT NULL |

Indexes:
- device_id
- recorded_at

---

# 4. Relationships

companies 1 --- N users

companies 1 --- N devices

devices 1 --- N gps_logs

devices 1 --- N battery_logs

devices 1 --- N network_logs

devices 1 --- N pairing_tokens

---

# 5. Multi-Tenant Rules

- Every business table contains `company_id`.
- Every API request must resolve the authenticated user's `company_id`.
- Cross-company queries are prohibited.
- Database access must never rely on client-provided company_id alone.

---

# 6. Data Retention

GPS Logs:
Keep permanently.

Battery Logs:
Keep permanently.

Network Logs:
Keep permanently.

Pairing Tokens:
Keep for audit purposes.

---

# 7. Naming Convention

- snake_case
- UUID primary keys
- Singular table names are not used; plural names only.
- UTC timestamps.

---

# 8. Performance Strategy

Indexes:
- company_id
- device_id
- recorded_at

Composite Index:
- device_id + recorded_at

Expected query patterns:
- Latest device status
- Device history by time range
- Company dashboard

---

# 9. Security

- HTTPS only.
- JWT authentication.
- Passwords stored using Argon2 or bcrypt hash.
- SQL parameterization only.
- Soft delete for master tables.
- Immutable log tables (GPS/Battery/Network).

---

# 10. Future Expansion

Reserved for:
- Geofence
- Notifications
- Remote Assistance
- Device Commands

Current schema supports future expansion without breaking existing tables.
