# Product Requirements Document (PRD)

**Project:** DeviceOps SaaS  
**Version:** 1.0 (MVP)  
**Status:** Approved for Development  
**Document Owner:** Product Team

---

# 1. Product Overview

## Product Name

DeviceOps SaaS

## Vision

Build a lightweight, cloud-based platform that allows companies to monitor the operational status of company-owned Android devices from a centralized web dashboard.

The platform focuses on operational visibility instead of traditional Mobile Device Management (DeviceOps SaaS).

---

# 2. Problem Statement

Many companies distribute Android devices to employees for operational activities. Existing Mobile Device Management solutions are often expensive, overly complex, and include features that smaller organizations do not need.

Companies primarily need to answer three questions:

- Where is my operational device?
- Is the device online?
- Is the device healthy?

Current solutions create unnecessary complexity for these simple operational needs.

---

# 3. Product Goals

The MVP aims to provide:

- Company-owned workspace
- Secure multi-tenant architecture
- Android Agent with QR pairing
- GPS tracking
- Battery monitoring
- Network status monitoring
- Offline data collection with automatic synchronization
- Web dashboard for administrators

---

# 4. Out of Scope (MVP)

The following features are intentionally excluded:

- Remote control
- Screen sharing
- Mobile Device Management policies
- Camera access
- Audio streaming
- File transfer
- Chat
- AI assistant
- Push commands to device

---

# 5. Target Users

## Primary Users

- Shipping companies
- Logistics companies
- Mining companies
- Construction companies
- Security companies
- Organizations with operational Android devices

## User Roles

### Company Owner

Responsible for workspace management.

### Administrator

Responsible for monitoring devices.

### Viewer

Read-only dashboard access.

---

# 6. Product Architecture

```
Android Agent
      │
HTTPS API
      │
FastAPI Backend
      │
PostgreSQL
      │
Web Dashboard
```

---

# 7. Core Product Modules

## Module 1 - Authentication

Functions

- Login
- Logout
- Refresh Token
- Forgot Password

---

## Module 2 - Company Workspace

Each company owns its own isolated workspace.

Each workspace contains:

- Users
- Devices
- GPS History
- Settings

No company can access another company's data.

---

## Module 3 - Device Pairing

Flow

Administrator

↓

Create Device

↓

Generate QR Code

↓

Crew opens Android Agent

↓

Scan QR

↓

Device Registered

Device pairing happens only once.

---

## Module 4 - Android Agent

Responsibilities

- Run in background
- Capture GPS
- Capture Battery Level
- Capture Network Status
- Store data locally when offline
- Synchronize automatically when internet is available

The Android Agent contains no operational dashboard.

---

## Module 5 - GPS Tracking

Collected Data

- Latitude
- Longitude
- Timestamp
- Accuracy

Tracking is interval-based.

GPS history must be preserved.

---

## Module 6 - Battery Monitoring

Collected Data

- Battery Percentage
- Charging Status

---

## Module 7 - Network Monitoring

Collected Data

- Online / Offline
- WiFi / Cellular
- Last Synchronization Time

---

## Module 8 - Offline Synchronization

The application must continue collecting data while internet is unavailable.

Workflow

```
Collect Data

↓

Save Local

↓

Internet Available?

No

↓

Keep Saving

↓

Internet Returns

↓

Upload All Pending Records

↓

Mark Synced
```

No collected data may be lost.

---

## Module 9 - Dashboard

Dashboard Components

- Company Overview
- Device List
- Live Map
- Device Detail
- GPS History
- Device Status

---

# 8. User Journey

Administrator

Login

↓

Dashboard

↓

Create Device

↓

Generate QR

↓

Give QR to Crew

↓

Device Connected

↓

Monitor Device

Crew

Install Android Agent

↓

Open App

↓

Scan QR

↓

Connected

↓

No further interaction required

---

# 9. Functional Requirements

FR-001
The system shall support company registration.

FR-002
The system shall isolate company data using multi-tenant architecture.

FR-003
The administrator shall generate QR pairing codes.

FR-004
Android Agent shall register using QR.

FR-005
Android Agent shall collect GPS.

FR-006
Android Agent shall collect battery information.

FR-007
Android Agent shall collect network status.

FR-008
Android Agent shall work offline.

FR-009
Android Agent shall synchronize automatically.

FR-010
Dashboard shall display device status.

FR-011
Dashboard shall display latest location.

FR-012
Dashboard shall display battery percentage.

FR-013
Dashboard shall display network status.

FR-014
Dashboard shall display synchronization timestamp.

FR-015
Dashboard shall display GPS history.

---

# 10. Non-Functional Requirements

Availability

99.5%

Security

HTTPS only

Performance

Dashboard load < 3 seconds

Scalability

Support multi-company architecture.

Maintainability

Containerized deployment.

---

# 11. Business Rules

- One device belongs to one company.
- One QR Code may only be used once.
- Deleted companies cannot access the platform.
- Offline records must remain until synchronized.
- GPS history cannot be modified manually.
- Device identity cannot be changed after pairing without re-registration.

---

# 12. Success Metrics

- Device registration under 1 minute.
- GPS synchronization success rate >99%.
- Dashboard loading under 3 seconds.
- Zero cross-company data leakage.
- Automatic synchronization after internet recovery.

---

# 13. Technical Stack

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

Deployment

- Docker
- Docker Compose
- Coolify
- Ubuntu VPS

---

# 14. MVP Deliverables

Web Dashboard

- Authentication
- Company Workspace
- Device Management
- Live Map
- GPS History
- Battery Status
- Network Status

Android Agent

- QR Pairing
- GPS Collection
- Battery Collection
- Network Collection
- Offline Storage
- Auto Synchronization

Backend

- REST API
- Authentication
- Device Management
- GPS Service
- Synchronization Service

---

# 15. Future Roadmap

Version 2

- Geofence

Version 3

- Notifications

Version 4

- Remote Assistance

---

# 16. Definition of Done

The MVP is considered complete when:

- Company can create a workspace.
- Device can be paired using QR.
- Android Agent automatically sends GPS, battery, and network status.
- Offline data is synchronized automatically after internet recovery.
- Administrator can monitor all company devices from the web dashboard.
- Multi-tenant isolation is verified.
- System is deployable through Docker and Coolify on Ubuntu VPS.
