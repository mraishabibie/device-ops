# Design Brief

**Project:** DeviceOps SaaS  
**Version:** 1.0 (MVP)

---

# Objective

Design a modern B2B SaaS web application for monitoring company-owned Android operational devices.

The UI must look production-ready and suitable for enterprise customers.

---

# Product Summary

DeviceOps is a cloud-based operational monitoring platform.

The platform allows companies to:

- Pair Android devices using QR Code
- Monitor GPS location
- Monitor battery status
- Monitor network status
- View synchronization history
- Manage company users and devices

The platform is NOT:
- A Mobile Device Management (MDM) solution
- A Remote Desktop solution

---

# Target Users

- Company Owner
- Administrator
- Operations Team

Primary device: Desktop (1440px)

---

# Brand Personality

- Professional
- Clean
- Reliable
- Modern
- Minimal
- Enterprise

Avoid:
- Glassmorphism
- Gaming UI
- Heavy gradients
- Fancy animations
- Colorful dashboards

---

# Design Direction

Create a premium B2B SaaS interface similar in quality to Linear, Vercel, Stripe Dashboard, Notion, or Clerk.

Focus on:
- Simplicity
- Readability
- Clear hierarchy
- Fast scanning
- Operational efficiency

---

# Color Palette

Primary: Blue

Success: Green

Warning: Orange

Danger: Red

Neutral: Gray

Background: White

Dark Mode: Excluded from MVP

---

# Typography

Font: Inter

Use a clear typography hierarchy.

---

# Component Library

- shadcn/ui
- Tailwind CSS
- Lucide Icons

---

# Pages to Design

## 1. Login

- Company Logo
- Email
- Password
- Sign In

---

## 2. Dashboard

Summary Cards

- Total Devices
- Online Devices
- Offline Devices

Main Layout

- Live Map
- Device Status Table

---

## 3. Device List

Columns

- Device Name
- Battery
- Network
- Last Sync
- Latest Location

Functions

- Search
- Sort
- Pagination

---

## 4. Device Detail

Display

- Device Information
- GPS History
- Battery History
- Network History

---

## 5. Company Settings

- Company Information
- Workspace Settings

---

## 6. User Management

- User List
- Add User
- Edit User
- Disable User

---

## 7. Android Agent

One single screen only.

Display:

- Connected Status
- Device Name
- Last Sync
- App Version

No additional pages.

---

# UX Rules

- Maximum 3 clicks to reach any feature.
- Sidebar always visible on desktop.
- Tables are the primary information component.
- Maps provide operational context.
- Empty states must be designed.
- Loading states must use skeleton loaders.
- Error states must provide clear actions.

---

# Responsive Rules

Desktop: Primary experience

Tablet: Supported

Mobile: Read-only monitoring

---

# Deliverables

Produce a complete end-to-end design including:

- High-fidelity desktop UI
- Design System
- Reusable Components
- Auto Layout
- Developer-ready Figma structure

---

# AI Prompt

Create a polished enterprise SaaS dashboard using Next.js conventions, Tailwind CSS, and shadcn/ui components.

The final result must be realistic, production-ready, minimalist, and immediately implementable by developers.
