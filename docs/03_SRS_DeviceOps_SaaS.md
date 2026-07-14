# Software Requirements Specification (SRS)

**Project:** DeviceOps SaaS  
**Version:** 1.0 (MVP)

---

# 1. Purpose

This document defines the functional and non-functional requirements for DeviceOps SaaS. It serves as the primary development reference for AntiGravity.

---

# 2. System Scope

DeviceOps SaaS consists of:

- Web Dashboard
- REST API
- Android Agent

The Android Agent collects operational device information and synchronizes it with the cloud every **30 minutes** using an offline-first strategy.

---

# 3. User Roles

## Owner
- Manage company
- Manage users
- Manage devices

## Admin
- Manage devices
- Monitor dashboard

## Viewer
- Read-only dashboard

---

# 4. Functional Requirements

## Authentication

### FR-001 Login

Description:
Users shall authenticate using email and password.

Validation:
- Email required
- Password required

Negative Cases:
- Invalid email
- Wrong password
- Deleted account
- Disabled account
- Suspended company

Acceptance:
Redirect user to dashboard.

---

### FR-002 Logout

Invalidate access token and refresh token.

---

## Company

### FR-003 Company Isolation

Every request shall only access data belonging to the authenticated company.

Negative Case

User modifies API request with another company_id.

Expected Result

Request denied.

---

## Device Pairing

### FR-004 Generate QR

Owner/Admin can generate pairing QR.

Validation

- Device must exist.
- Device must not already be paired.

Negative Cases

- Expired QR
- Used QR
- Invalid QR

Expected Result

Registration rejected.

---

### FR-005 Pair Android Device

Workflow

Install APK

↓

Open App

↓

Scan QR

↓

Register

↓

Connected

Acceptance

Device appears on dashboard.

---

## Android Agent

### FR-006 Background Service

The Android Agent shall run continuously in the background.

If Android terminates the service, it shall restart automatically using WorkManager.

---

### FR-007 Data Collection

Every 30 minutes the Android Agent shall collect:

- GPS
- Battery
- Network Status

Collected data shall first be stored locally.

---

### FR-008 Offline Storage

When internet is unavailable:

- Store data locally.
- Do not discard any records.

---

### FR-009 Synchronization

Every 30 minutes:

If internet is available:

Upload pending records.

If internet is unavailable:

Keep records locally.

When internet becomes available:

Upload all unsynchronized records.

---

## Dashboard

### FR-010 Dashboard Overview

Display

- Total Devices
- Online Devices
- Offline Devices

---

### FR-011 Device List

Display

- Device Name
- Last Sync
- Battery
- Network
- Latest Location

---

### FR-012 Device Detail

Display

- Device Information
- Latest GPS
- GPS History
- Battery History
- Network History

---

### FR-013 Live Map

Display latest location of all devices.

---

# 5. Non Functional Requirements

Availability

99.5%

Response Time

Dashboard page <3 seconds

API

Average response <500 ms

Scalability

Support thousands of devices.

Timezone

UTC

---

# 6. Security Requirements

- HTTPS only.
- JWT Authentication.
- Refresh Token.
- Password hashing using Argon2.
- QR pairing token expires automatically.
- One QR can only be used once.
- Company data isolation mandatory.
- SQL Injection protection.
- Rate limiting on login API.
- Audit logging for authentication events.

---

# 7. Business Rules

BR-001

One device belongs to one company.

BR-002

One QR token may only be used once.

BR-003

GPS logs are immutable.

BR-004

Deleted users cannot login.

BR-005

Only Owner and Admin can pair devices.

---

# 8. Offline Strategy

Store & Forward

Workflow

Collect Data

↓

Save Local Database

↓

Internet Available?

No

↓

Wait

↓

Next 30 Minute Cycle

↓

Internet Available

↓

Upload All Pending Records

↓

Mark Synced

---

# 9. Negative Test Cases

## Authentication

- Wrong password
- Invalid email
- Disabled account
- Deleted account

---

## Pairing

- QR expired
- QR already used
- Device already paired

---

## Synchronization

- Internet disconnected
- API timeout
- Server unavailable
- Duplicate upload
- Partial upload failure

Expected

Retry on next synchronization cycle.

---

## GPS

- GPS disabled
- GPS permission denied
- Invalid coordinates

Expected

Store failure reason and retry later.

---

## Battery

- Battery information unavailable

Expected

Skip battery log without interrupting synchronization.

---

## Network

- No network
- Network switch during upload

Expected

Resume upload on next cycle.

---

# 10. Acceptance Criteria

The MVP is accepted when:

- Company can register.
- Users can login.
- Devices can be paired using QR.
- Android Agent collects GPS every 30 minutes.
- Android Agent collects battery every 30 minutes.
- Android Agent collects network status every 30 minutes.
- Offline data is preserved.
- Offline data is synchronized automatically.
- Dashboard displays latest device status.
- Dashboard displays GPS history.
- Company data is isolated.

---

# 11. Technology Stack

Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- MapLibre

Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- Redis

Android

- Kotlin
- WorkManager
- Foreground Service
- Fused Location Provider

Infrastructure

- Docker
- Docker Compose
- Coolify
- Ubuntu VPS

---

# 12. Definition of Done

Development is complete when:

- All functional requirements pass.
- All negative test cases pass.
- Multi-tenant isolation is verified.
- Android Agent works after device reboot.
- Offline synchronization works correctly.
- Docker deployment succeeds.
- Coolify deployment succeeds.
