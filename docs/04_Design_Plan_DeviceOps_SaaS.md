# Design Plan

**Project:** DeviceOps SaaS  
**Version:** 1.0 (MVP)

---

# 1. Design Philosophy

DeviceOps is a desktop-first SaaS platform designed for operational monitoring.

Core Principles:

- Clean
- Fast
- Minimal
- Data-first
- Low learning curve
- Professional enterprise appearance

---

# 2. Design Goals

- Monitor devices in one screen.
- Reduce clicks.
- Display operational data clearly.
- Prioritize readability over decoration.

---

# 3. Target Screen Size

Primary

- 1440px Desktop

Supported

- 1280px
- 1920px
- Tablet (responsive)

Mobile dashboard is not part of MVP.

---

# 4. Design System

Typography

- Font: Inter
- Heading: Bold
- Body: Regular

Spacing

- 4px Grid System

Border Radius

- 12px

Icons

- Lucide Icons

Color Palette

Primary
- Blue

Success
- Green

Warning
- Orange

Danger
- Red

Neutral
- Gray

Dark mode is not included in MVP.

---

# 5. UI Framework

Frontend

- Next.js

Component Library

- shadcn/ui

Styling

- Tailwind CSS

Map

- MapLibre

Charts

- Recharts

Icons

- Lucide

---

# 6. Navigation Structure

```
Login

↓

Dashboard

├── Devices
├── Live Map
├── Device Detail
├── Company Settings
└── User Management
```

---

# 7. Sitemap

Dashboard

- Overview
- Device Status
- Recent Activity

Devices

- Device List
- Device Detail

Settings

- Company
- Users
- Profile

---

# 8. Dashboard Layout

Header

- Company Name
- User Profile

Sidebar

- Dashboard
- Devices
- Settings

Main Content

- Summary Cards
- Live Map
- Device Table

---

# 9. Dashboard Widgets

Summary Cards

- Total Devices
- Online Devices
- Offline Devices

Map

- Latest Device Locations

Table

Columns

- Device Name
- Device Type
- Department
- Battery
- Network
- Last Sync
- Last Location

---

# 10. Device Detail Page

Sections

Device Information

Latest Status

GPS History

Battery History

Network History

---

# 11. Android Agent UI

Single Screen

```
DeviceOps Agent

Status

Connected

Device Name

Last Sync

App Version
```

No settings page.

No dashboard.

No configuration.

---

# 12. User Flow

Administrator

Login

↓

Dashboard

↓

Devices

↓

Select Device

↓

View Detail

Crew

Install APK

↓

Open App

↓

Scan QR

↓

Connected

↓

Done

---

# 13. UX Rules

- Maximum 3 clicks to reach device details.
- Primary actions always visible.
- No hidden navigation.
- Tables support sorting.
- Search available on device list.

---

# 14. Empty States

No Devices

Display onboarding message with "Add Device".

No GPS History

Display "No location data available."

Offline Device

Display last synchronization timestamp.

---

# 15. Loading States

- Skeleton loaders for cards.
- Spinner for map loading.
- Progress indicator during pairing.

---

# 16. Error States

Login Failed

Show inline validation.

QR Expired

Show error dialog with regenerate option.

Network Error

Display retry action.

---

# 17. Responsive Behavior

Desktop

Full layout.

Tablet

Collapsible sidebar.

Mobile

Read-only support only (MVP).

---

# 18. Accessibility

- WCAG friendly contrast.
- Keyboard navigation.
- Visible focus states.
- Minimum touch target 44px.

---

# 19. Component List

- Button
- Input
- Select
- Dialog
- Card
- Badge
- Table
- Tabs
- Toast
- Map Container
- Search Box
- Pagination

Use shadcn/ui components as the project standard.

---

# 20. Design Deliverables

- Complete desktop wireframes
- High-fidelity UI
- Design system
- Component library
- Responsive layouts
- Developer-ready Figma screens

