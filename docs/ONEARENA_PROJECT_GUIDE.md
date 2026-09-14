# OneArena — Comprehensive Project Guide

**Version:** 2.0  
**Last Updated:** 2026-09-10  
**Status:** Complete Architecture + Implementation Roadmap  
**Author:** AI Engineering Team

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Architecture Foundation](#2-architecture-foundation)
3. [Database & Business Model](#3-database--business-model)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Authentication & Session](#5-authentication--session)
6. [Feature: Turf Management](#6-feature-turf-management)
7. [Feature: Booking Lifecycle](#7-feature-booking-lifecycle)
8. [Feature: Invoice & Payment System](#8-feature-invoice--payment-system)
9. [Feature: Owner Onboarding](#9-feature-owner-onboarding)
10. [Feature: Owner Subscription](#10-feature-owner-subscription)
11. [Feature: Dashboards](#11-feature-dashboards)
12. [Frontend Architecture](#12-frontend-architecture)
13. [API Conventions & Endpoints](#13-api-conventions--endpoints)
14. [Business Rules & Financial Safety](#14-business-rules--financial-safety)
15. [Performance & Optimization](#15-performance--optimization)
16. [Deployment & Environment](#16-deployment--environment)
17. [Known Issues & Technical Debt](#17-known-issues--technical-debt)
18. [Implementation Roadmap](#18-implementation-roadmap)

---

## 1. PROJECT OVERVIEW

### 1.1 What is OneArena?

OneArena is a **multi-vendor sports turf booking platform** that connects:
- **Players (Users)** - Search, book, and pay for turf time
- **Owners (Admins)** - Manage turfs, pricing, slots, and bookings
- **Managers** - Assist owners with day-to-day operations
- **Super Admin** - Control platform, approve owners, manage categories

### 1.2 Tech Stack

| Layer | Technology | Port | Purpose |
|-------|-----------|------|---------|
| **Frontend** | Next.js 15 (React) + TypeScript + Tailwind | 3000 | User interface |
| **Backend** | NestJS + Express + TypeScript | 5000 | RESTful API |
| **Database** | PostgreSQL + Prisma ORM | 5432 | Data persistence |
| **Authentication** | Better Auth + JWT + Bcrypt | - | User identity & security |
| **Payments** | Stripe API | - | Online payments |
| **File Storage** | Cloudinary | - | Turf images |
| **Email** | SMTP (configured) | - | Notifications |
| **Cron Jobs** | node-cron | - | Async background tasks |

### 1.3 Development Commands

```bash
# Backend
cd backend
npm run dev          # Watch mode on port 5000
npm run build        # Compile TypeScript
npm run db:migrate   # Run Prisma migrations

# Frontend
cd frontend
npm run dev          # Watch mode on port 3000
npm run build        # Next.js compilation
npm run lint         # ESLint check

# Database
npx prisma studio   # Visual database explorer
npx prisma generate # Regenerate Prisma types
```

---

## 2. ARCHITECTURE FOUNDATION

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                   │
│  ├─ Auth: Login/Register/OAuth                             │
│  ├─ Common: Browse turfs, turf detail, booking flow        │
│  ├─ Dashboards: Player, Owner, Manager, Super Admin        │
│  └─ Components: KPI cards, tables, forms, modals            │
└────────────────┬────────────────────────────────────────────┘
                 │ Axios + React Query
                 │ (JWT + Cookie Authentication)
┌────────────────▼────────────────────────────────────────────┐
│                   BACKEND (NestJS/Express)                   │
│  ├─ Auth Module: Registration, Login, Token Refresh        │
│  ├─ Booking Module: PREBOOKED→CONFIRMED→BOOKED→COMPLETED   │
│  ├─ Payment Module: Stripe + Manual payments               │
│  ├─ Turf Module: Create/Edit turfs, pricing, slots         │
│  ├─ Invoice Module: Track financial records                │
│  ├─ Authorization: Manager assignment & permissions        │
│  ├─ Reporting: Dashboards (owner, manager, admin)          │
│  └─ Background: Cron jobs (slot generation, cleanup)       │
└────────────────┬────────────────────────────────────────────┘
                 │ Prisma ORM + Connection Pool
┌────────────────▼────────────────────────────────────────────┐
│              DATABASE (PostgreSQL + Prisma)                  │
│  ├─ Users: Players, Owners, Managers, Super Admin          │
│  ├─ Turfs: Properties with facilities, pricing rules       │
│  ├─ Slots: Time slots with availability status             │
│  ├─ Bookings: Player requests with lifecycle states        │
│  ├─ Invoices: Financial records linked to bookings         │
│  ├─ Payments: Multiple payments per invoice                │
│  ├─ Refunds: Refund requests + processing                  │
│  ├─ Reviews: Player ratings + owner replies               │
│  └─ Commission: Revenue sharing between platform & owners  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

**Backend:**
```
backend/
├── src/
│   ├── app/
│   │   ├── modules/          # 17 feature modules
│   │   ├── helpers/          # Stripe, utilities
│   │   ├── interfaces/       # TypeScript contracts
│   │   ├── lib/              # Auth, encryption
│   │   ├── utils/            # Token, datetime helpers
│   │   ├── middlewares/
│   │   ├── templates/        # Email templates
│   │   └── errors/
│   ├── common/               # Guards, decorators, filters
│   ├── config/               # App config, Cloudinary, Stripe
│   ├── shared/               # Prisma, response helpers
│   ├── types/                # TypeScript definitions
│   ├── generated/prisma/     # Auto-generated Prisma types
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema/
│       ├── schema.prisma
│       ├── turfschema.prisma
│       ├── user.prisma
│       └── enums.prisma
└── package.json
```

**Frontend:**
```
frontend/
├── src/
│   ├── app/
│   │   ├── (authRouteGroup)/       # Login/Register
│   │   ├── (commonLayout)/          # Public pages
│   │   ├── (dashboardLayout)/       # Protected routes
│   │   └── layout.tsx, error.tsx, loading.tsx
│   ├── components/                  # React components
│   ├── context/                     # Auth, search, theme context
│   ├── hooks/                       # useAuth, useGet, usePatch, etc.
│   ├── lib/                         # Auth utilities, validators
│   ├── services/                    # API calls (server actions)
│   ├── types/                       # TypeScript definitions
│   ├── zod/                         # Validation schemas
│   └── styles.css
├── public/                          # Static assets
└── package.json
```

---

## 3. DATABASE & BUSINESS MODEL

### 3.1 Core Entity Relationships

```
User (1)
  ├── (1) OwnerProfile (for owners)
  ├── (1) ManagerProfile (for managers)
  ├── (N) TurfManager (manages multiple turfs)
  ├── (N) Turf (owns multiple turfs)
  ├── (N) Booking (player bookings)
  ├── (N) Payment (payments received by manager)
  └── (N) Session, Account (Better Auth)

Turf (1)
  ├── (1) TurfCategory
  ├── (N) TurfManager (assigned managers)
  ├── (N) TurfFacility (junction: turf ↔ facility)
  ├── (N) TurfImage
  ├── (N) TurfPriceRule (time-based pricing)
  ├── (N) Package (bundles with facilities)
  ├── (N) TurfSlot (available time slots)
  ├── (N) Booking (player bookings)
  └── (N) Review (player ratings)

TurfSlot (1)
  └── (1) Booking (UNIQUE: one booking per slot)

Booking (1)
  ├── (1) User (player)
  ├── (1) TurfSlot
  ├── (1) BookingInvoice
  └── (N) Refund

BookingInvoice (1)
  ├── (1) Booking (UNIQUE)
  └── (N) Payment (multiple payments per invoice)

Payment (N)
  ├── (1) BookingInvoice
  ├── (1) User (receivedBy)
  └── (N) Refund

Review (1)
  ├── (1) Booking (UNIQUE: one review per booking)
  ├── (1) User
  ├── (1) Turf
  └── (N) ReviewReply
```

### 3.2 Key Models & Fields

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **User** | id, email, name, role (USER/ADMIN/MANAGER/SUPER_ADMIN), status | User identity |
| **OwnerProfile** | userId, verificationStatus (SUBMITTED→APPROVED/REJECTED), NID, tradeLicense | Owner details + approval |
| **ManagerProfile** | userId, contactNumber, address | Manager details |
| **Turf** | name, address, basePrice, slotMinutes, status (DRAFT→ACTIVE), ownerId | Turf property |
| **TurfSlot** | slotDate, startMinute, endMinute, price, slotStatus (AVAILABLE/RESERVED/BOOKED) | Time slot |
| **Booking** | bookingNumber, status (PREBOOKED→CONFIRMED→BOOKED→COMPLETED), totalAmount, idempotencyKey | Player booking |
| **BookingInvoice** | invoiceNumber, totalAmount, paidAmount, isFullPaid, status (UNPAID→PAID) | Financial record |
| **Payment** | amount, method (CASH/STRIPE), status (PENDING/SUCCEEDED), idempotencyKey | Payment record |
| **Refund** | amount, status (REQUESTED→APPROVED→PROCESSED), reason | Refund request |
| **Review** | rating (1-5), comment, isHidden | Player feedback |

### 3.3 Enums

```prisma
UserRole = USER | ADMIN | MANAGER | SUPER_ADMIN
UserStatus = ACTIVE | INACTIVE | SUSPENDED | BLOCKED
OwnerVerificationStatus = PENDING | SUBMITTED | APPROVED | REJECTED
TurfStatus = DRAFT | PENDING_APPROVAL | ACTIVE | INACTIVE | REJECTED
BookingStatus = PREBOOKED | CONFIRMED | BOOKED | KICKOFF | COMPLETED | CANCELLED
SlotStatus = AVAILABLE | RESERVED | BOOKED
PaymentStatus = UNPAID | PARTIALLY_PAID | PAID | REFUNDED | PENDING | SUCCEEDED | FAILED
PaymentMethod = CASH | CARD | MOBILE | STRIPE
PaymentType = FULL | PARTIAL | ADVANCE | OVERPAYMENT
RefundStatus = REQUESTED | APPROVED | REJECTED | PROCESSED
CommissionStatus = PENDING | PAID | CANCELLED
ManagerPermission = TURF_VIEW | TURF_CREATE | TURF_UPDATE | TURF_DELETE | SLOT_VIEW | SLOT_MANAGE | BOOKING_VIEW | BOOKING_MANAGE | FACILITY_VIEW | FACILITY_MANAGE | PACKAGE_VIEW | PACKAGE_MANAGE | REVIEW_VIEW | REVIEW_MANAGE
```

---

## 4. USER ROLES & PERMISSIONS

### 4.1 Role Definitions

#### **USER (Player)**
- Browse and search turfs
- Book available slots
- Pay for bookings
- View own bookings and invoices
- Leave reviews (after booking completion)
- Request refunds
- **Cannot:** Create turfs, manage other users, access admin features

#### **ADMIN (Owner)**
- Create and manage own turfs
- Set pricing rules for own turfs
- Generate and manage slots
- View own bookings and payment history
- Assign managers to turfs
- View dashboard (turfs, revenue, bookings)
- **Cannot:** Access other owners' data, manage users, platform settings

#### **MANAGER**
- Assist owner with assigned turfs (permissions-based)
- Common permissions: BOOKING_MANAGE, SLOT_MANAGE, REVIEW_MANAGE
- View assigned turf bookings and reviews
- Confirm/complete bookings
- Record manual payments
- **Cannot:** Delete turfs, modify pricing, access unassigned turfs

#### **SUPER_ADMIN**
- Full platform access
- Approve/reject owner applications
- Approve/reject turfs
- Manage categories and facilities
- View platform analytics
- Manage commission rules
- **Cannot:** Create turfs directly, book as player

### 4.2 Permission Matrix

| Action | USER | ADMIN | MANAGER | SUPER_ADMIN |
|--------|------|-------|---------|-------------|
| Browse turfs | ✅ | ✅ | ✅ | ✅ |
| Create booking | ✅ | ✅ | ✅ | ✅ |
| Create turf | ❌ | ✅ (own) | ❌ | ❌ |
| Edit turf | ❌ | ✅ (own) | ⚠️ (if permitted) | ✅ |
| Confirm booking | ❌ | ✅ (own) | ⚠️ (if permitted) | ✅ |
| Record payment | ❌ | ✅ (own) | ⚠️ (if permitted) | ✅ |
| Approve owner | ❌ | ❌ | ❌ | ✅ |
| Manage categories | ❌ | ❌ | ❌ | ✅ |
| Set commission | ❌ | ❌ | ❌ | ✅ |

### 4.3 Manager Permissions (Granular)

Owners can assign specific permissions to managers:

```
TURF Management:
  - TURF_VIEW: See turf details
  - TURF_CREATE: Create new turfs
  - TURF_UPDATE: Edit turf info
  - TURF_DELETE: Delete turfs

SLOT Management:
  - SLOT_VIEW: See slots
  - SLOT_MANAGE: Edit, disable, change pricing

BOOKING Management:
  - BOOKING_VIEW: See bookings
  - BOOKING_MANAGE: Confirm, reject, record payments

FACILITY Management:
  - FACILITY_VIEW: See facilities
  - FACILITY_MANAGE: Add/remove facilities

PACKAGE Management:
  - PACKAGE_VIEW: See packages
  - PACKAGE_MANAGE: Create, edit, delete packages

REVIEW Management:
  - REVIEW_VIEW: See reviews
  - REVIEW_MANAGE: Hide inappropriate reviews, reply
```

---

## 5. AUTHENTICATION & SESSION

### 5.1 Authentication Flow

```
1. User Registration (Email/Password or OAuth)
   POST /auth/register
   ├─ Email validation
   ├─ Password hashing (bcryptjs, 10 rounds)
   ├─ Create User record
   ├─ Create OwnerProfile (if role=ADMIN)
   └─ Return: { user, accessToken, refreshToken, sessionToken }

2. Session Management (Better Auth)
   ├─ Session token stored in httpOnly cookie: better-auth.session_token
   ├─ Session record in DB (session table) with expiry
   ├─ Used for server actions and token validation
   └─ Auto-refresh: Tokens refresh before 1-hour access expiry

3. JWT Authentication
   ├─ accessToken: 1-hour expiry, used for API requests
   ├─ refreshToken: 7-day expiry, rotated on refresh
   ├─ Tokens stored in httpOnly cookies (secure)
   └─ Refresh endpoint: POST /auth/refresh-token

4. Authorization Guards
   ├─ CheckAuthGuard: Validates session + JWT on protected endpoints
   ├─ @AuthRoles decorator: Specifies allowed roles
   ├─ Ownership check: Ensures user owns resource
   └─ Permission check: Validates manager permissions
```

### 5.2 Key Auth Files

| File | Purpose |
|------|---------|
| `backend/src/app/modules/auth/auth.service.ts` | Registration, login, token refresh |
| `backend/src/app/modules/auth/auth.controller.ts` | HTTP endpoints |
| `backend/src/common/guards/check-auth.guard.ts` | Validates authentication |
| `backend/src/common/decorators/auth-roles.decorator.ts` | Role-based access |
| `frontend/src/lib/auth.ts` | useAuth() hook |
| `frontend/src/lib/authUtils.ts` | Token helpers |
| `frontend/src/lib/axios/httpClient.ts` | Axios interceptors for token refresh |

### 5.3 Session Handling (Frontend)

```typescript
// Load session on app startup
const { user, session, isLoading } = useAuth();

// Check role for conditional rendering
if (user?.role === UserRole.ADMIN) {
  // Show owner dashboard
}

// Auto-refresh token before expiry
// Polling every 5 minutes via useAuth hook

// Logout clears cookies + redirects to login
```

---

## 6. FEATURE: TURF MANAGEMENT

### 6.1 Turf Lifecycle

```
DRAFT (Owner creates)
  ↓ (Owner completes details)
PENDING_APPROVAL (Waiting for Super Admin)
  ↓ (Super Admin approves)
ACTIVE (Players can book)
  ↓ (If owner wants to pause)
INACTIVE (No new bookings)
  ↓ (Reactivate)
ACTIVE
```

### 6.2 Turf Fields

```typescript
{
  id: string
  name: string                 // Turf name
  description: string
  categoryId: string          // Category ID (Football, Cricket, etc)
  address: string
  latitude: number
  longitude: number
  basePrice: Decimal          // ৳ base price per slot
  slotMinutes: number         // 30, 45, 60 minutes
  status: TurfStatus          // DRAFT → ACTIVE
  ownerId: string             // Owner's user ID
  facilities: Facility[]      // Amenities (parking, lights, etc)
  images: TurfImage[]         // Photos from Cloudinary
  priceRules: TurfPriceRule[] // Time-based pricing
  packages: Package[]         // Bundles (e.g., "2 hours + tea")
  slots: TurfSlot[]          // Generated time slots
  createdAt: DateTime
}
```

### 6.3 Creating a Turf

**Backend Endpoint:**
```
POST /admin/turfs
Authorization: ADMIN only
Body: {
  name: string
  categoryId: string
  description: string
  address: string
  latitude: number
  longitude: number
  basePrice: number
  slotMinutes: number
}
Response: { turf }
```

**Business Logic:**
1. Validate owner has active subscription (future feature)
2. Check max turf limit per subscription plan
3. Create Turf with status: DRAFT
4. Return turf ID
5. Owner must set up pricing rules + slots before activation

### 6.4 Pricing Rules

Owners can define time-based pricing:

```
Rule 1:
  - Monday-Friday
  - 18:00-21:00 (peak hours)
  - Price: ৳2000/slot

Rule 2:
  - Saturday-Sunday
  - Any time
  - Price: ৳2500/slot

Rule 3:
  - All days
  - 21:00+ (late night)
  - Price: ৳1500/slot
```

**Backend Logic:**
- If multiple rules match: Use most specific (latest rule)
- If no rules match: Use basePrice
- Never allow frontend to set price

### 6.5 Slot Generation (Automated)

**Cron Job:** Runs daily at 2 AM
- Generates slots for next 30 days
- Uses TurfPriceRule to determine price
- Status: AVAILABLE
- Cleanup: Deletes RESERVED slots older than 2 hours

**Manual Slot Generation:**
```
POST /admin/slots/{turfId}/generate
Body: { days: 30 }
Response: { created: 100, skipped: 0 }
```

---

## 7. FEATURE: BOOKING LIFECYCLE

### 7.1 Complete Booking Flow

```
┌─────────────────────────────────────────────────────────────┐
│ PLAYER CREATES BOOKING (POST /bookings)                     │
│ - Select turf + slot                                        │
│ - System verifies slot is AVAILABLE                         │
│ - Create Booking: status = PREBOOKED                        │
│ - Set slot.slotStatus = RESERVED                           │
│ - Auto-expire in 2 hours (cleanup cron)                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ PAYMENT PROCESSING (Manual or Stripe)                       │
│ - Player records cash payment OR                            │
│ - Player initiates Stripe checkout                          │
│ - Invoice created when payment captured                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ ADMIN CONFIRMS BOOKING (POST /bookings/{id}/confirm)        │
│ - Invoice created (if not from Stripe)                      │
│ - Booking: PREBOOKED → CONFIRMED                            │
│ - Slot: RESERVED → BOOKED                                   │
│ - Record ready for game                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ GAME EXECUTION                                              │
│ - Admin marks: POST /bookings/{id}/kick-off                │
│   Booking: CONFIRMED → KICKOFF                              │
│ - Admin marks: POST /bookings/{id}/complete               │
│   Booking: KICKOFF → COMPLETED                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ POST-GAME                                                   │
│ - Player leaves review (1-5 stars + comment)               │
│ - Player can request refund (if applicable)                │
│ - Record closed                                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Booking States

| State | Duration | Description |
|-------|----------|-------------|
| **PREBOOKED** | 2 hours | Slot reserved, awaiting confirmation |
| **CONFIRMED** | Until game | Invoice created, payment finalized |
| **KICKOFF** | During game | Game has started |
| **COMPLETED** | Forever | Game finished, can review |
| **CANCELLED** | Forever | Player cancelled PREBOOKED booking |
| **EXPIRED** | Forever | PREBOOKED booking auto-expired after 2h |

### 7.3 Slot State Transitions

```
AVAILABLE ──> RESERVED  (when booking created)
                  │
                  ├──> AVAILABLE  (if booking expires/cancelled)
                  │
                  └──> BOOKED     (if booking confirmed)
                          │
                          └──> AVAILABLE  (after booking completed/refunded)
```

### 7.4 Creating a Booking

**Endpoint:**
```
POST /bookings
Authorization: USER only
Body: {
  slotId: string
  idempotencyKey: string  // Prevents duplicates
}
Response: { booking, slot, totalAmount }
```

**Validation:**
1. Slot must exist and be AVAILABLE
2. No other active booking on same slot (race condition check with advisory lock)
3. Create Booking with status: PREBOOKED
4. Set slot.slotStatus: RESERVED
5. Set expiry timer: 2 hours

**Important:** Invoice is NOT created yet. Only when admin confirms.

---

## 8. FEATURE: INVOICE & PAYMENT SYSTEM

### 8.1 Correct Architecture

```
❌ WRONG:
Booking ──1:N──> Payment

✅ CORRECT:
Booking ──1:1──> BookingInvoice ──1:N──> Payment
```

### 8.2 Invoice Lifecycle

```
BOOKING CREATED (PREBOOKED)
    ↓
BOOKING CONFIRMED (ADMIN confirms)
    ↓
BOOKING INVOICE CREATED
  - status: UNPAID (no payments yet)
  - totalAmount: ৳2000
  - paidAmount: ৳0
    ↓
PAYMENT #1 (Advance)
  - amount: ৳500 (CASH)
  - status: SUCCEEDED
  - invoice.paidAmount: ৳500
  - invoice.status: PARTIALLY_PAID
    ↓
PAYMENT #2 (Remaining)
  - amount: ৳1500 (STRIPE)
  - status: SUCCEEDED
  - invoice.paidAmount: ৳2000
  - invoice.status: PAID
    ↓
GAME COMPLETED
```

### 8.3 Invoice Statuses

| Status | Meaning | Condition |
|--------|---------|-----------|
| **UNPAID** | No payments received | paidAmount == 0 |
| **PARTIALLY_PAID** | Some payment received | 0 < paidAmount < totalAmount |
| **PAID** | Full payment received | paidAmount >= totalAmount |
| **REFUNDED** | Refund issued | Refund processed |

### 8.4 Payment Processing

#### Manual Payment

**Endpoint:**
```
POST /payments/{invoiceId}/manual
Authorization: ADMIN/MANAGER only
Body: {
  amount: number
  method: 'CASH' | 'CARD' | 'MOBILE'
  reference?: string         // Transaction ID
  note?: string              // Notes for bookkeeping
}
Response: { payment, invoice }
```

**Logic:**
1. Validate amount doesn't exceed remaining balance
2. Create Payment record with status: SUCCEEDED
3. Update invoice.paidAmount += payment.amount
4. Update invoice.status based on total paid
5. Return updated invoice

#### Stripe Payment

**Endpoint:**
```
POST /payments/{bookingId}/checkout
Authorization: USER only
Response: { checkoutUrl, sessionId }
```

**Flow:**
1. Fetch Booking + Invoice
2. Create Stripe checkout session
3. Set metadata: { paymentId, bookingId }
4. Return checkout URL
5. Player completes payment on Stripe
6. Stripe webhook notifies backend

**Webhook:**
```
POST /payments/stripe/webhook (raw body)
Event: checkout.session.completed
├─ Fetch Payment by paymentId
├─ Update Payment.status: SUCCEEDED
├─ Update invoice.paidAmount
├─ Update invoice.status
└─ Success (204)
```

### 8.5 Payment Safety Rules

✅ **ALWAYS DO:**
- Calculate price on backend from pricing rules
- Validate overpayment before accepting
- Use transactions for Payment + Invoice updates
- Log all payment attempts
- Idempotency check: Prevent double-processing webhook

❌ **NEVER DO:**
- Trust frontend price
- Skip role/ownership check
- Update invoice without updating all payments
- Allow payment without valid invoice
- Process payment twice (use idempotencyKey)

---

## 9. FEATURE: OWNER ONBOARDING

### 9.1 Complete Onboarding Flow

```
STEP 1: REGISTRATION
┌────────────────────────────────────────┐
│ Register as "Owner" (Turf Operator)   │
│ - Email/password signup               │
│ - Select role: Owner                  │
│ - Create User + OwnerProfile         │
│ - Status: SUBMITTED                   │
└────────────┬───────────────────────────┘
             │
             ▼
STEP 2: PROFILE COMPLETION
┌────────────────────────────────────────┐
│ Fill Profile Information              │
│ - Full name                           │
│ - Contact number                      │
│ - Business address                    │
│ - Gender                              │
│ - NID number                          │
│ - Business registration number        │
│ - Trade license number                │
│ - Upload documents (Cloudinary)       │
└────────────┬───────────────────────────┘
             │
             ▼
STEP 3: ADMIN APPROVAL
┌────────────────────────────────────────┐
│ Super Admin Reviews Application       │
│ - View profile details                │
│ - Review uploaded documents           │
│ - Approve or Reject                   │
│ - Status: APPROVED | REJECTED         │
└────────────┬───────────────────────────┘
             │
             ▼ (If APPROVED)
STEP 4: SUBSCRIPTION SELECTION (FUTURE)
┌────────────────────────────────────────┐
│ Choose Subscription Plan              │
│ - 1 Turf: ৳1000/month                 │
│ - 2 Turfs: ৳1800/month                │
│ - 3 Turfs: ৳2200/month                │
│ - Start 1-month free trial            │
│ - Status: ACTIVE (TRIAL)              │
└────────────┬───────────────────────────┘
             │
             ▼
STEP 5: READY TO CREATE TURF
┌────────────────────────────────────────┐
│ Owner Can Now:                        │
│ - Create turfs                        │
│ - Set pricing rules                   │
│ - Generate slots                      │
│ - Receive bookings                    │
│ - Manage payments                     │
└────────────────────────────────────────┘
```

### 9.2 Current Status

✅ **Implemented:**
- User registration with ADMIN role
- OwnerProfile model with verification fields
- Verification status enum (SUBMITTED/APPROVED/REJECTED)

⚠️ **Missing:**
- Frontend form for profile completion
- Super Admin approval workflow UI
- Document upload integration
- Rejection reason handling + resubmission

### 9.3 Owner Profile Endpoints

**Get Profile:**
```
GET /owner-profile
Response: { id, userId, contactNumber, address, verificationStatus, ... }
```

**Update Profile:**
```
PATCH /owner-profile
Body: { contactNumber, address, gender, nidNumber, ... }
Response: { profile }
```

**Super Admin Approval:**
```
PATCH /super-admin/owner-profile/{userId}/approve
Response: { profile, verificationStatus: APPROVED }

PATCH /super-admin/owner-profile/{userId}/reject
Body: { reason: string }
Response: { profile, verificationStatus: REJECTED }
```

---

## 10. FEATURE: OWNER SUBSCRIPTION

### 10.1 Subscription Model (TO BE IMPLEMENTED)

```prisma
model SubscriptionPlan {
  id        String    @id @default(cuid())
  name      String    // "Starter" | "Professional" | "Enterprise"
  maxTurfs  Int       // 1, 2, 3, etc
  active    Boolean   @default(true)
  prices    SubscriptionPrice[]
  subscriptions OwnerSubscription[]
  createdAt DateTime  @default(now())
}

model SubscriptionPrice {
  id        String    @id @default(cuid())
  planId    String
  plan      SubscriptionPlan @relation(fields: [planId], references: [id])
  period    FixedPeriod // MONTHLY | HALF_YEARLY | YEARLY
  price     Decimal   // ৳1000.00
  createdAt DateTime  @default(now())
}

model OwnerSubscription {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  planId    String
  plan      SubscriptionPlan @relation(fields: [planId], references: [id])
  
  status    SubscriptionStatus // TRIAL | ACTIVE | EXPIRING | EXPIRED
  startDate DateTime
  endDate   DateTime
  renewalDate DateTime?
  
  trialStart DateTime?
  trialEnd   DateTime?
  isTrialUsed Boolean @default(false)
  
  billingCycle FixedPeriod
  autoRenew   Boolean @default(true)
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  EXPIRING
  EXPIRED
  CANCELLED
}
```

### 10.2 Subscription Lifecycle

```
REGISTRATION (New Owner)
  ├─ verificationStatus: SUBMITTED
  └─ No subscription yet

APPROVAL (Super Admin approves)
  ├─ verificationStatus: APPROVED
  ├─ Create OwnerSubscription
  ├─ status: TRIAL
  ├─ trialStart: today
  ├─ trialEnd: today + 1 month
  └─ maxTurfs: Based on plan

30 DAYS LATER
  ├─ Check subscription.trialEnd
  ├─ If not renewed: status: EXPIRED
  │   └─ Block creating new turfs
  └─ If renewed: status: ACTIVE
      └─ Update endDate, renewalDate

ONGOING (Active Subscription)
  ├─ Owner can create turfs (max = plan.maxTurfs)
  ├─ 7 days before expiry: status: EXPIRING
  │   └─ Prompt to renew
  └─ On renewal: status: ACTIVE, new dates

EXPIRED
  ├─ Cannot create new turfs
  ├─ Existing turfs remain ACTIVE
  ├─ Can receive bookings on existing turfs
  ├─ Can renew anytime
  └─ When renew: Reactivate

CANCELLATION
  ├─ Owner can cancel anytime
  ├─ status: CANCELLED
  ├─ autoRenew: false
  ├─ Turfs still operational
  └─ Must renew to create new turfs
```

### 10.3 Subscription Tiers (Example)

| Plan | Max Turfs | Monthly | Half-Yearly | Yearly | Target |
|------|-----------|---------|------------|--------|--------|
| Starter | 1 | ৳1000 | ৳2800 | ৳5000 | Individual operators |
| Professional | 2 | ৳1800 | ৳5000 | ৳9000 | Small chains |
| Enterprise | 5+ | Custom | Custom | Custom | Large operators |

### 10.4 Business Rules

✅ **Allowed:**
- Free trial for 1 month after approval
- Create N turfs based on subscription plan
- Receive unlimited bookings
- View all historical data when expired

❌ **Blocked:**
- Cannot create new turfs if subscription expired
- Cannot increase turf count beyond plan limit

⚠️ **Auto-Renewal:**
- Enabled by default
- Charge on renewal date
- Soft-fail: Keep active during failed charge
- Hard-fail after 3 attempts: Notify owner, request payment

---

## 11. FEATURE: DASHBOARDS

### 11.1 Player Dashboard

**URL:** `/user/dashboard`

**Sections:**

```
┌─────────────────────────────────────┐
│ Player Dashboard                    │
├─────────────────────────────────────┤
│ KPI Cards                           │
│ ├─ Upcoming Bookings (Count)       │
│ ├─ Last Booking Date                │
│ ├─ Total Spent (YTD)               │
│ └─ Pending Payments                 │
├─────────────────────────────────────┤
│ Recent Bookings (Table)             │
│ ├─ Turf Name                        │
│ ├─ Booking Date & Time              │
│ ├─ Amount                           │
│ ├─ Status                           │
│ └─ Action (View, Review, Request Refund)
├─────────────────────────────────────┤
│ Navigation                          │
│ ├─ All Bookings                     │
│ ├─ Invoices & Payments              │
│ ├─ My Reviews                       │
│ ├─ Refund Requests                  │
│ └─ Settings                         │
└─────────────────────────────────────┘
```

**Analytics:**
- Upcoming bookings (next 7 days)
- Total bookings (YTD)
- Total spent (with breakdown by turf)
- Average rating given

### 11.2 Owner Dashboard

**URL:** `/admin/dashboard`

**Sections:**

```
┌─────────────────────────────────────┐
│ Owner Dashboard                     │
├─────────────────────────────────────┤
│ Subscription Status (Alert Box)     │
│ ├─ Plan: Professional (2 Turfs)    │
│ ├─ Status: ACTIVE (20 days left)   │
│ └─ Action: Renew, Upgrade          │
├─────────────────────────────────────┤
│ KPI Cards (Row 1)                   │
│ ├─ Active Turfs (2/2)              │
│ ├─ This Month Bookings (45)         │
│ ├─ Gross Revenue (৳145,000)        │
│ ├─ Platform Commission (৳14,500)    │
│ └─ Net Revenue (৳130,500)          │
├─────────────────────────────────────┤
│ Charts (Row 2)                      │
│ ├─ Booking Trend (Last 30 days)    │
│ ├─ Revenue Trend                    │
│ ├─ Peak Hours (Heatmap)            │
│ └─ Top Performing Slots             │
├─────────────────────────────────────┤
│ Recent Bookings (Table)             │
│ ├─ Turf                             │
│ ├─ Date & Slot                      │
│ ├─ Amount                           │
│ ├─ Status                           │
│ └─ Payment Status                   │
├─────────────────────────────────────┤
│ Navigation (Left Sidebar)           │
│ ├─ Turfs Management                 │
│ ├─ Pricing & Slots                  │
│ ├─ Bookings                         │
│ ├─ Invoices & Payments              │
│ ├─ Reviews & Ratings                │
│ ├─ Refund Requests                  │
│ ├─ Payouts                          │
│ ├─ Managers                         │
│ ├─ Settings                         │
│ └─ Help                             │
└─────────────────────────────────────┘
```

**Analytics:**
- Total turfs (active/draft)
- Bookings (today, this month, YTD)
- Revenue (gross, net after commission)
- Commission paid to platform
- Payment status breakdown
- Peak booking times
- Popular turfs

### 11.3 Manager Dashboard

**URL:** `/manager/dashboard`

**Sections:**
- Assigned turfs (list)
- Bookings for assigned turfs
- Payment collection
- Reviews to manage
- KPI for assigned turfs only

### 11.4 Super Admin Dashboard

**URL:** `/super-admin/dashboard`

**Sections:**

```
┌─────────────────────────────────────┐
│ Platform Admin Dashboard            │
├─────────────────────────────────────┤
│ KPI Cards                           │
│ ├─ Total Users                      │
│ ├─ Active Owners                    │
│ ├─ Total Turfs                      │
│ ├─ Bookings (This Month)           │
│ ├─ Total Revenue                    │
│ ├─ Platform Commission (Our Share)  │
│ ├─ Pending Approvals                │
│ └─ Expiring Subscriptions           │
├─────────────────────────────────────┤
│ Management Sections                 │
│ ├─ Owner Applications (Verification)|
│ ├─ Turf Approvals (Status: DRAFT)  │
│ ├─ Commission Rules                 │
│ ├─ Subscription Plans               │
│ ├─ Categories & Facilities          │
│ ├─ User Management                  │
│ ├─ Booking Disputes                 │
│ └─ Platform Settings                │
├─────────────────────────────────────┤
│ Analytics                           │
│ ├─ Revenue by Owner                 │
│ ├─ Bookings Trend                   │
│ ├─ Commission Earned                │
│ ├─ Subscription Renewals            │
│ └─ User Growth                      │
└─────────────────────────────────────┘
```

---

## 12. FRONTEND ARCHITECTURE

### 12.1 Technology Stack

```
Next.js 15
├─ React 18 (UI rendering)
├─ TypeScript (type safety)
├─ Tailwind CSS (styling)
├─ Shadcn/ui (component library)
├─ React Query (data fetching & caching)
├─ React Hook Form (form handling)
├─ Zod (schema validation)
├─ Axios (HTTP client)
├─ Lucide React (icons)
└─ next-auth / Better Auth (authentication)
```

### 12.2 Folder Structure

```
frontend/src/
├── app/
│   ├── (authRouteGroup)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (commonLayout)/
│   │   ├── page.tsx (home)
│   │   ├── turfs/page.tsx (browse)
│   │   └── turfs/[turfId]/page.tsx (detail + booking)
│   ├── (dashboardLayout)/
│   │   ├── user/dashboard/...
│   │   ├── admin/dashboard/...
│   │   ├── manager/dashboard/...
│   │   └── super-admin/dashboard/...
│   └── layout.tsx (root layout with auth wrapper)
├── components/
│   ├── RootLayoutWrapper.tsx (auth provider)
│   ├── common/ (buttons, cards, modals)
│   ├── header/
│   ├── footer/
│   ├── ui/ (shadcn components)
│   ├── modules/ (feature-specific)
│   └── premium/ (KPI cards, tables)
├── context/
│   ├── AuthContext.tsx (user session)
│   ├── SearchContext.tsx (search filters)
│   └── ThemeContext.tsx (light/dark mode)
├── hooks/
│   ├── index.ts
│   ├── useAuth.ts (load user session)
│   ├── usePagination.ts (pagination logic)
│   ├── useSort.ts (sorting)
│   ├── useModal.ts (dialog state)
│   └── api/ (useGet, usePost, usePatch, etc)
├── lib/
│   ├── auth.ts (useAuth hook + session)
│   ├── authUtils.ts (token helpers)
│   ├── axios/ (httpClient with interceptors)
│   ├── token.utils.ts (JWT parsing)
│   ├── cookie.utils.ts (cookie management)
│   ├── time-utils.ts (date formatting)
│   ├── validations.ts (Zod schemas)
│   └── utils.ts (general helpers)
├── services/
│   ├── auth.services.ts (server actions)
│   ├── api.services.ts (API endpoints)
│   └── dashboard.services.ts (dashboard data)
├── types/
│   ├── api.type.ts (ApiResponse, pagination)
│   └── auth.type.ts (User, LoginPayload, etc)
├── zod/
│   ├── auth.validation.ts
│   ├── booking.validation.ts
│   └── turf.validation.ts
└── styles.css
```

### 12.3 Component Philosophy

**Reusability First:**
- Common UI components in `components/common/`
- Feature-specific in `components/modules/`
- DRY principle: Avoid duplicate buttons, cards, tables

**Server Components:**
- Pages use server components by default
- Only "use client" when needed (interactivity)
- Fetch data in servers; pass to client components

**State Management:**
- React Context for auth + theme
- React Query for API data + caching
- Local state for UI (modals, forms)

### 12.4 Protected Route Middleware

**File:** `frontend/src/middleware.ts`

```typescript
export function middleware(request: NextRequest) {
  // Delegate to proxy.ts for auth checks
  return proxy(request);
}

// Protect dashboard routes
export const config = {
  matcher: ['/admin/:path*', '/user/:path*', '/manager/:path*', '/super-admin/:path*']
};
```

**Flow:**
1. Middleware checks if user is authenticated
2. If not: Redirect to login
3. If yes: Check role + permissions
4. Allow or deny based on user.role

---

## 13. API CONVENTIONS & ENDPOINTS

### 13.1 Response Format

**Success (2xx):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "...",
    "status": "PREBOOKED",
    ...
  }
}
```

**Error (4xx/5xx):**
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid input",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

### 13.2 Pagination

**Query Params:**
```
GET /bookings?page=1&limit=10&sortBy=createdAt&sortOrder=desc

Response:
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 250,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 13.3 Filtering

**Examples:**
```
GET /bookings?status=CONFIRMED&turfId=xyz
GET /turfs?categoryId=1&minPrice=1000&maxPrice=3000
GET /invoices?status=UNPAID&startDate=2024-01-01&endDate=2024-12-31
```

### 13.4 Endpoint Categories

| Category | Purpose | Auth |
|----------|---------|------|
| `/auth/*` | Registration, login, refresh | Public/User |
| `/bookings/*` | Booking CRUD & state | USER/ADMIN |
| `/invoices/*` | Invoice viewing | USER/ADMIN |
| `/payments/*` | Payment processing | USER/ADMIN |
| `/refunds/*` | Refund workflow | USER/ADMIN |
| `/admin/turfs*` | Turf management | ADMIN |
| `/admin/slots*` | Slot management | ADMIN |
| `/admin/pricing*` | Pricing rules | ADMIN |
| `/owner/*` | Owner operations | ADMIN |
| `/super-admin/*` | Platform admin | SUPER_ADMIN |
| `/reporting/*` | Dashboards | USER/ADMIN/MANAGER |

### 13.5 Complete Endpoint Reference

See full endpoint list in section 5 of architecture analysis (70+ endpoints documented).

---

## 14. BUSINESS RULES & FINANCIAL SAFETY

### 14.1 Booking Business Rules

**CREATE:**
- Slot must be AVAILABLE
- Player must be authenticated (USER role)
- No duplicate bookings on same slot (advisory lock prevents race condition)
- Set expiry: Current time + 2 hours
- Invoice NOT created yet

**CONFIRM:**
- Only PREBOOKED bookings can be confirmed
- Admin/Manager must have permission
- Create BookingInvoice automatically
- Transition: PREBOOKED → CONFIRMED
- Slot: RESERVED → BOOKED

**REJECT:**
- Only PREBOOKED bookings can be rejected
- Release slot: RESERVED → AVAILABLE
- Optionally create refund (if payment received)

**CANCEL (Player):**
- Only PREBOOKED bookings can be cancelled by player
- Release slot back to AVAILABLE
- Auto-cleanup: Cron deletes RESERVED slots older than 2 hours

**KICKOFF:**
- Only CONFIRMED bookings can start
- Transition: CONFIRMED → KICKOFF

**COMPLETE:**
- Only KICKOFF bookings can complete
- Transition: KICKOFF → COMPLETED
- Now eligible for refund/review

### 14.2 Payment Business Rules

**CREATION:**
- Never trust frontend price — recalculate from pricing rules
- Use Decimal type for all financial calculations
- Validate booking exists and is in valid state
- Set idempotencyKey (prevents duplicate payment processing)

**VALIDATION:**
- Overpayment check: payment.amount ≤ remaining balance
- Status check: Only SUCCEEDED payments count toward invoice
- Method validation: CASH/CARD/MOBILE/STRIPE only

**UPDATES (After Payment Success):**
- Fetch invoice.paidAmount (sum of all SUCCEEDED payments)
- Calculate: remainingAmount = invoice.totalAmount - paidAmount
- Update invoice.status:
  - paidAmount == 0 → UNPAID
  - 0 < paidAmount < total → PARTIALLY_PAID
  - paidAmount >= total → PAID

### 14.3 Slot Pricing Rules

**Priority (if multiple match):**
1. Most specific rule (latest created, most conditions)
2. Time-based rule (specific start/end time)
3. Day-of-week rule
4. Default: basePrice

**Examples:**
```
Priority 1: MON-FRI, 18:00-20:00 → ৳2000
Priority 2: All days, 21:00+ → ৳1500
Priority 3: (Base price)
```

### 14.4 Commission & Revenue Split

**Current Model (Manual):**
- Owner sets commission rule (% or flat amount)
- Super Admin must configure rule per owner
- No automated calculation yet

**Future Model (TO BE IMPLEMENTED):**
- Commission calculated on every payment
- Automatic commission invoice generation
- Scheduled commission payouts

**Example:**
```
Booking Amount: ৳2000
Commission (10%): ৳200
Owner Receives: ৳1800
Platform Keeps: ৳200
```

### 14.5 Financial Transactions

**ALWAYS use `prisma.$transaction()` for:**
- Booking creation + slot status update
- Payment processing + invoice update
- Refund + payment reversal
- Subscription renewal + plan change

**Example:**
```typescript
return prisma.$transaction(async (tx) => {
  // All operations succeed together or rollback
  const booking = await tx.booking.create({...});
  const slot = await tx.turfSlot.update({...});
  return { booking, slot };
});
```

---

## 15. PERFORMANCE & OPTIMIZATION

### 15.1 Database Indexes

```prisma
model Booking {
  ...
  @@index([userId, createdAt])           // User bookings
  @@index([status, createdAt])           // Filter by status
  @@index([slotId])                      // Prevent duplicates
  @@index([bookingExpiresAt])            // Expiry cleanup
}

model TurfSlot {
  ...
  @@index([turfId, slotDate, slotStatus]) // Availability query
  @@index([slotDate, slotStatus])        // Slot cleanup
}

model User {
  ...
  @@index([role])                        // Role filtering
  @@index([status])                      // User status
}
```

### 15.2 API Optimization

**DO:**
- Use pagination (page, limit)
- Select only needed fields (avoid over-fetching)
- Cache static data (categories, facilities)
- Batch operations where possible
- Use database views for complex aggregations

**DON'T:**
- N+1 queries (always include relations)
- Fetch all data then filter in app
- Redundant API calls (use React Query cache)
- Large response bodies

### 15.3 Frontend Caching

**React Query:**
```typescript
// Auto-refetch after 5 minutes
const { data } = useQuery({
  queryKey: ['bookings'],
  queryFn: () => api.getBookings(),
  staleTime: 5 * 60 * 1000,
});

// Disable refetch on window focus
refetchOnWindowFocus: false,
```

### 15.4 Cron Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Slot generation | Daily 2 AM | Create slots for next 30 days |
| Slot cleanup | Every 30 min | Delete RESERVED slots > 2h old |
| Subscription check | Daily 3 AM | Check expiring subscriptions |
| Commission invoices | Monthly 1st | Generate commission invoices |
| Payout processing | Weekly | Process approved payouts |

---

## 16. DEPLOYMENT & ENVIRONMENT

### 16.1 Environment Variables

**Backend (.env):**
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/onearena_db

# Server
NODE_ENV=development
PORT=5000

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRY=1h
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_REFRESH_EXPIRY=7d

# Better Auth
BETTER_AUTH_SECRET=your_better_auth_secret_min_32_chars

# OAuth (Google)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@onearena.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLIC_KEY=pk_live_xxx

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Redis (Future caching)
REDIS_URL=redis://localhost:6379
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### 16.2 Build & Start

**Backend:**
```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Database setup
npx prisma migrate dev --name initial
npx prisma db seed (if seed file exists)
```

**Frontend:**
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

---

## 17. KNOWN ISSUES & TECHNICAL DEBT

### 17.1 Critical Issues

| Issue | Severity | Status | Solution |
|-------|----------|--------|----------|
| Commission not automated | High | ⚠️ Backend model exists | Add cron job + calculation |
| Owner verification UI missing | High | ❌ Frontend | Build approval workflow UI |
| Manager permissions not enforced | High | ⚠️ Permissions assigned but not checked | Add checks in service methods |
| Payout system incomplete | High | ❌ UI stub only | Implement bank integration |
| Subscription model missing | High | ❌ Not implemented | Add schema + endpoints |

### 17.2 Frontend Issues

- ~2685 Prettier/encoding violations in lint
- Google OAuth untested (missing test credentials)
- SMTP inbox not accessible for email testing
- Booking calendar integration incomplete

### 17.3 Testing Gaps

- [ ] Stripe webhook end-to-end
- [ ] Overpayment scenarios
- [ ] Concurrent booking on same slot
- [ ] Race condition in slot reservation
- [ ] Manager permission enforcement
- [ ] Commission calculation
- [ ] Subscription renewal + expiry

---

## 18. IMPLEMENTATION ROADMAP

### Phase 1: Core (COMPLETED ✅)
- ✅ Authentication & session
- ✅ Booking lifecycle (PREBOOKED→CONFIRMED)
- ✅ Invoice & payment system
- ✅ Turf management
- ✅ Slot generation & cleanup (cron)
- ✅ Price rules
- ✅ Refund workflow
- ✅ Reviews & ratings
- ✅ Basic dashboards

### Phase 2: Owner Onboarding (PARTIAL ⚠️)
- ✅ OwnerProfile model
- ✅ Verification status enum
- ❌ Profile completion UI
- ❌ Document upload UI
- ❌ Super Admin approval workflow

### Phase 3: Owner Subscription (PENDING ❌)
- ❌ SubscriptionPlan model
- ❌ OwnerSubscription model
- ❌ Plan selection UI
- ❌ Auto-renewal logic
- ❌ Turf limit enforcement

### Phase 4: Advanced Features (PENDING ❌)
- ❌ Commission automation
- ❌ Payout system
- ❌ Notifications (email/push)
- ❌ Real-time updates (WebSocket)
- ❌ Analytics dashboard
- ❌ Referral system
- ❌ Promotional codes
- ❌ Dispute resolution

### Phase 5: Polish (PENDING ❌)
- ❌ Premium 10-day booking UI
- ❌ Mobile optimization
- ❌ Skeleton loading states
- ❌ Error state designs
- ❌ Accessibility audit
- ❌ Performance optimization
- ❌ Linting fixes (~2685 violations)

---

## DECISION LOG

### Architecture Decisions

1. **BookingInvoice Model Requirement** (CONFIRMED)
   - Reason: Separates booking intent from financial records
   - Benefit: Supports multiple payments per booking
   - Impact: All payment queries must use invoice relations

2. **Slot Status vs Booking Status Separation** (CONFIRMED)
   - Slot: AVAILABLE → RESERVED → BOOKED
   - Booking: PREBOOKED → CONFIRMED → BOOKED
   - Reason: Slot reflects availability, Booking reflects player intent

3. **No Invoice on Booking Creation** (CONFIRMED)
   - Invoice created on booking confirmation
   - Reason: Admin approval required before financial commitment
   - Benefit: Reduces invoice clutter, clearer audit trail

4. **Decimal Type for Financial Calculations** (CONFIRMED)
   - Always use Prisma Decimal, never float
   - Reason: Currency precision (no rounding errors)
   - Impact: Must cast to number for JSON responses

5. **Prisma Transactions for Multi-Step Operations** (CONFIRMED)
   - All booking + payment updates use $transaction()
   - Reason: ACID compliance, race condition prevention
   - Impact: Performance cost acceptable for data safety

---

## QUICK REFERENCE

### Important URLs
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Database Explorer: `npx prisma studio`
- API Docs: `http://localhost:5000/api/docs` (if Swagger implemented)

### Important Files
- Backend entry: `backend/src/main.ts`
- Frontend entry: `frontend/src/app/layout.tsx`
- Database schema: `backend/prisma/schema/`
- Auth logic: `backend/src/app/modules/auth/`
- Booking logic: `backend/src/app/modules/booking/`

### Common Commands
```bash
# Database
npx prisma migrate dev --name description
npx prisma generate
npx prisma studio
npx prisma db seed

# Backend
npm run dev
npm run build
npm run db:migrate

# Frontend
npm run dev
npm run build
npm run lint
```

### Key Roles
- **USER:** Player (book, pay, review)
- **ADMIN:** Owner (create turf, manage slots, record payment)
- **MANAGER:** Assist owner (specific permissions per turf)
- **SUPER_ADMIN:** Platform control (approve owners, turfs, settings)

---

**Last Updated:** 2026-09-10  
**Next Review:** When major features added or architecture changes  
**Maintainer:** AI Engineering Team

**To update this guide:**
1. Identify the changed section
2. Update the relevant section above
3. Update the "Last Updated" date
4. Note in DECISION LOG if architecture changed
