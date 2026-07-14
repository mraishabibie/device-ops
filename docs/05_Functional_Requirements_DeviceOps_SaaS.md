# Functional & Non-Functional Requirements

**Project:** DeviceOps SaaS  
**Version:** 1.0 (MVP)

---

# 1. Purpose

This document defines all feature-level Functional Requirements (FR) and Non-Functional Requirements (NFR). It is the primary implementation guide for the development team.

---

# Module: Authentication

## FR-001 Login

**Description**
User authenticates using email and password.

**Flow**
1. Enter email.
2. Enter password.
3. Click Sign In.
4. Validate credentials.
5. Generate JWT + Refresh Token.
6. Redirect to Dashboard.

**Validation**
- Email required
- Valid email format
- Password required

**Negative Cases**
- Invalid email
- Wrong password
- Suspended company
- Deleted user
- Disabled user

**Acceptance Criteria**
- User successfully reaches Dashboard.

**API**
POST `/auth/login`

**Database**
users

**UI**
Login Page

**NFR**
- HTTPS only
- Response <500ms
- Password hashed (Argon2)
- Rate limit login requests

---

## FR-002 Logout

**Description**
Invalidate user session.

**Acceptance Criteria**
- Access token becomes invalid.
- User redirected to Login.

**API**
POST `/auth/logout`

---

# Module: Company

## FR-003 Company Workspace Isolation

**Description**
Every company has an isolated workspace.

**Business Rules**
- Users only access their own company data.
- company_id is enforced server-side.

**Negative Cases**
- User attempts to access another company's resources.

**Expected Result**
HTTP 403 Forbidden.

**NFR**
- Multi-tenant isolation mandatory.

---

# Module: Device Pairing

## FR-004 Generate Pairing QR

**Description**
Owner/Admin generates a one-time QR code for a device.

**Validation**
- Device exists.
- Device is not paired.

**Negative Cases**
- Device already paired.
- Invalid device.
- QR expired.

**Acceptance Criteria**
- QR generated successfully.

**API**
POST `/devices/{id}/pair`

**Database**
pairing_tokens

---

## FR-005 Pair Android Device

**Flow**
Install APK → Open Agent → Scan QR → Register → Connected

**Validation**
- Valid QR
- QR not expired
- QR unused

**Negative Cases**
- Expired QR
- Reused QR
- Invalid QR

**Acceptance Criteria**
- Device pairing status becomes PAIRED and device status is set to PENDING_SYNC.

**Database**
devices
pairing_tokens

---

# Module: Android Agent

## FR-006 Background Service

**Description**
Agent runs continuously using WorkManager.

**Acceptance Criteria**
- Service resumes after device reboot.

**NFR**
- Low battery consumption.
- Crash recovery supported.

---

## FR-007 Device Data Collection

**Collection Interval**
Every 30 minutes.

**Collected Data**
- GPS
- Battery
- Network Status

**Process**
Collect → Save Local Database

**Negative Cases**
- GPS unavailable
- Permission denied
- Battery info unavailable

**Acceptance Criteria**
- Data stored locally.

**Database**
gps_logs
battery_logs
network_logs

---

## FR-008 Offline Storage

**Description**
Store all collected data while offline.

**Business Rules**
- No data loss.
- Do not overwrite unsynchronized records.

**Acceptance Criteria**
- Pending records remain available until synchronized.

---

## FR-009 Automatic Synchronization

**Description**
Every 30 minutes, attempt synchronization.

**Flow**
1. Check internet.
2. Upload pending records.
3. Mark synchronized.

**Negative Cases**
- API timeout
- Connection lost
- Partial upload

**Expected Result**
Retry during next synchronization cycle.

**NFR**
- Store & Forward architecture.
- Idempotent synchronization.

---

# Module: Dashboard

## FR-010 Dashboard Overview

**Display**
- Total Devices
- Online Devices
- Offline Devices

**Acceptance Criteria**
Cards display current values.

---

## FR-011 Device List

**Display**
- Device Name
- Battery
- Network
- Last Sync
- Latest Location

**Functions**
- Search
- Sort

---

## FR-012 Device Detail

**Display**
- Device Profile
- GPS History
- Battery History
- Network History

---

## FR-013 Live Map

**Description**
Display latest location for all paired devices.

**Acceptance Criteria**
Map markers update after synchronization.

---

# Module: User Management

## FR-014 User Management

Owner can:

- Create User
- Edit User
- Disable User (updates status to DISABLED instead of soft-deleting)

Viewer cannot modify users.

---

# Global Non-Functional Requirements

## Security

- HTTPS only
- JWT Authentication
- Refresh Token
- Argon2 password hashing
- SQL Injection protection
- XSS protection
- Secure HTTP headers
- One-time QR pairing

---

## Performance

- Dashboard load <3 seconds
- API average response <500ms
- Pagination for all tables

---

## Reliability

- Offline-first
- Automatic retry
- No data loss during synchronization

---

## Scalability

- Multi-tenant architecture
- UUID primary keys
- PostgreSQL
- Docker deployment

---

## Maintainability

- FastAPI
- SQLAlchemy
- Next.js
- TypeScript
- Kotlin
- Clean Architecture
- Docker Compose

---

## Compatibility

Dashboard:
- Chrome
- Edge
- Firefox

Android:
- Android 11+

---

## Logging

Record:
- Login
- Logout
- Pairing
- Synchronization
- API Errors

---

## Definition of Done

Development is complete when:
- All FR pass.
- All NFR are satisfied.
- Negative cases are handled.
- Acceptance criteria are fulfilled.
- Feature matches PRD, Database Design, and SRS.
