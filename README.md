# Field Finder Pro

PRODUCTION-READY MULTI-VENDOR FOOTBALL & CRICKET TURF BOOKING PLATFORM

You are a Principal Software Architect and Senior Full-Stack Engineer with 10+ years of experience building production-grade marketplace, booking, payment, authentication, and multi-tenant systems.

Build a complete production-ready Football & Cricket Turf Booking Marketplace.

This is NOT a demo.

This is NOT a CRUD tutorial.

This must be designed as a real commercial SaaS/marketplace platform that can support thousands of users, hundreds/thousands of turf owners, multiple venues, concurrent bookings, payments, commissions, schedules, and role-based dashboards.

1. PRODUCT CONCEPT

Build a platform where:

Turf Owners

Multiple turf owners can register on the platform.

Each turf owner can:

Create and manage their turf/venue

Add football/cricket turfs

Upload turf images

Set location

Set facilities

Set opening/closing hours

Create pricing

Configure available booking slots

Configure different prices for different days/times

Manage bookings

Accept/reject bookings where required

View revenue

View platform commission

Manage their profile

Manage venue status

Block unavailable dates/times

View booking history

Customers

Customers can:

Register/login

Login with Google

Verify email

Search nearby turfs

Share their location

Search by city/area

Search by map/location

Filter turfs

View turf details

View images

View facilities

View available dates

View available time slots

Select a slot

Make a partial/advance booking payment

Receive booking confirmation

View upcoming bookings

Cancel bookings according to policy

View booking history

Receive email notifications

Manage their profile

Platform Admin

The website/platform owner can:

Manage users

Manage turf owners

Manage turfs

Approve/reject turf owner registration where applicable

Approve/reject turf listings

Manage bookings

Manage commissions

Configure commission policy

Monitor payments

Monitor platform revenue

Manage disputes/cancellations

Manage categories/facilities

Suspend users

Suspend turf owners

Suspend turfs

View analytics

Manage platform settings

2. THREE MAIN DASHBOARDS

The application must have three separate dashboard experiences.

CUSTOMER DASHBOARD

Features:

Dashboard overview

Profile

My bookings

Upcoming bookings

Booking history

Cancel booking

Payment history

Favorite turfs

Notifications

Account settings

TURF OWNER DASHBOARD

Features:

Overview

Display:

Total bookings

Today's bookings

Upcoming bookings

Total revenue

Platform commission

Net earnings

Pending bookings

Cancelled bookings

Occupancy statistics

Turf Management

Create turf

Edit turf

Delete/deactivate turf

Upload multiple images

Set turf type

Set football/cricket

Set capacity

Set facilities

Set address

Set coordinates

Set pricing

Set operating hours

Schedule Management

Owner must be able to:

Create available slots

Define recurring schedules

Block dates

Block specific time slots

Configure holidays

Configure peak-hour pricing

Configure weekend pricing

Configure different pricing by date/time

Booking Management

View bookings

Filter bookings

View booking details

Confirm booking

Reject booking

Cancel booking

Mark customer as checked-in

Mark booking as completed

Financial Management

Total sales

Platform commission

Net earnings

Pending settlements

Completed settlements

Payment history

3. ADMIN DASHBOARD

Admin dashboard must contain:

Analytics

Total customers

Total turf owners

Total turfs

Total bookings

Today's bookings

Monthly bookings

Gross booking value

Platform commission

Revenue statistics

Cancellation statistics

User Management

Customers

Turf owners

Admins

Search/filter users

Activate/deactivate users

View user details

Turf Management

View all turfs

Approve/reject turfs

Activate/deactivate turfs

Edit turf

View owner

View booking statistics

Booking Management

View all bookings

Search bookings

Filter by status

Filter by turf

Filter by owner

Filter by date

View payment information

Commission Management

Admin must be able to configure:

Global commission percentage

Fixed commission if required

Turf-specific commission if required

Commission rules

Effective dates

Example:

Customer pays: 1000 BDT

Platform commission: 10%

Platform earns: 100 BDT

Turf owner receives: 900 BDT

The commission calculation must be persisted with every booking/payment transaction so historical transactions are not affected if the commission policy changes later.

4. TECHNOLOGY STACK

Frontend

Next.js

TypeScript

React

Tailwind CSS

shadcn/ui or equivalent professional component system

Framer Motion for animations

React Hook Form

Zod

TanStack Query

Leaflet/Mapbox/Google Maps for location/map functionality

Use a modern, responsive UI.

5. BACKEND

Use:

Node.js

TypeScript

Express.js

PostgreSQL

Prisma ORM

Better Auth

The Node.js/Express backend is the primary backend.

Do NOT put business logic inside Next.js API routes.

Next.js should primarily handle the frontend/application UI.

All core business operations should go through the Express backend.

6. AUTHENTICATION

Use Better Auth.

Authentication must support:

Email/password

Registration

Login

Logout

Email verification

Forgot password

Reset password

Session management

Google OAuth

Users must be able to:

Continue with Google

Automatically create an account if necessary

Link Google identity to an existing account where appropriate

7. COOKIE-BASED SESSION AUTHENTICATION

Use secure HTTP-only cookie-based sessions.

Do NOT store authentication tokens in:

localStorage

sessionStorage

JavaScript-accessible cookies

Authentication cookies must be:

HTTP-only

Secure in production

SameSite configured correctly

Properly scoped

Expiration controlled

Protected against common session attacks

The frontend should authenticate against the Node/Express backend through cookies.

Configure CORS correctly for the Next.js frontend.

Example architecture:

Next.js
|
| HTTPS + Cookie
↓
Express API
|
↓
Better Auth
|
↓
PostgreSQL

8. EMAIL SYSTEM

The Node.js backend must be responsible for sending application emails.

Use an email provider through Node.js.

Examples:

SMTP

Nodemailer

Resend

SendGrid

Amazon SES

Implement an email service abstraction.

Example:

EmailService

Methods:

sendVerificationEmail()

sendPasswordResetEmail()

sendBookingConfirmationEmail()

sendBookingCancellationEmail()

sendBookingReminderEmail()

sendOwnerBookingNotificationEmail()

Never put email-sending logic directly inside controllers.

Use:

Controller
→ Service
→ Email Service

9. LOCATION & TURF SEARCH

Customers must be able to find nearby turfs.

Support:

Location permission

User can click:

"Use my location"

Browser obtains:

latitude

longitude

Then backend searches nearby turfs.

Manual search

User can search:

City

Area

Address

Turf name

Nearby search

Example:

"Turfs within 5 km"

The backend should support geographic distance calculations.

Prefer PostgreSQL geographic functionality such as PostGIS where appropriate.

Store:

latitude

longitude

address

city

area

country

Do NOT depend only on the textual address for distance calculations.

10. TURF MODEL

A turf should support:

Name

Slug

Description

Sport type

Turf type

Owner

Images

Address

Latitude

Longitude

City

Area

Facilities

Rules

Capacity

Pricing

Opening time

Closing time

Status

Approval status

Rating

Review count

Sports:

Football

Cricket

Both

Possible facilities:

Parking

Washroom

Changing room

Flood lights

Drinking water

Seating area

CCTV

Equipment rental

Shower

Wi-Fi

Design the system so more facilities can be added later.

11. BOOKING SYSTEM

Booking is the core business functionality.

The booking system must prevent double booking.

Example:

Turf:

ABC Football Arena

Date:

2026-09-10

Time:

7:00 PM - 8:00 PM

Customer A starts booking.

At the same time:

Customer B tries to book the same slot.

The backend must guarantee that only one booking succeeds.

Do NOT rely only on frontend validation.

Use database-level protection and transactions.

12. BOOKING FLOW

Recommended flow:

Customer selects:

Turf
↓
Date
↓
Available slot
↓
Booking details
↓
Price calculation
↓
Advance payment
↓
Payment verification
↓
Booking confirmation
↓
Email notification

The final booking must only become confirmed after successful payment verification.

13. PARTIAL / ADVANCE PAYMENT

Support partial booking payments.

Example:

Total booking price:

2000 BDT

Advance percentage:

30%

Customer pays:

600 BDT

Remaining:

1400 BDT

The booking must store:

Total amount

Advance amount

Remaining amount

Paid amount

Currency

Payment status

Payment provider

Payment transaction ID

Payment timestamps

Do NOT calculate historical payment values dynamically from current pricing.

Persist financial snapshots.

14. PAYMENT ARCHITECTURE

Design the payment layer so that the provider can be replaced later.

Use an abstraction such as:

PaymentService

Methods:

createPayment()

verifyPayment()

refundPayment()

getPaymentStatus()

The system should not tightly couple business logic to one payment provider.

For Bangladesh deployment, design the architecture so providers such as:

SSLCommerz

bKash

Nagad

can be integrated.

If Stripe is used, keep it behind the payment abstraction.

15. COMMISSION SYSTEM

Platform earns commission from every successful booking.

Example:

Booking amount:

2000 BDT

Platform commission:

10%

Platform commission:

200 BDT

Owner earning:

1800 BDT

Store the financial snapshot:

Booking
├── totalAmount
├── advanceAmount
├── remainingAmount
├── commissionRate
├── commissionAmount
├── ownerAmount
└── currency

Never recalculate old transactions using the current commission configuration.

16. DATABASE DESIGN

Use PostgreSQL + Prisma.

Design proper relational models.

At minimum consider:

User
Account
Session
Verification
Role
TurfOwnerProfile
CustomerProfile
Turf
TurfImage
Sport
Facility
TurfFacility
OperatingHour
TurfSchedule
BlockedSchedule
Booking
BookingItem
Payment
Commission
Review
Favorite
Notification
AuditLog
PlatformSetting

You may introduce additional entities where required.

Use:

UUIDs

Foreign keys

Proper indexes

Unique constraints

Composite indexes

Timestamps

Soft deletion where appropriate

17. IMPORTANT DATABASE INDEXES

Optimize for common queries.

Examples:

Turf owner ID

Turf location

Turf status

Turf approval status

Booking turf ID

Booking date

Booking status

Customer ID

Owner ID

Payment transaction ID

For location search, use appropriate PostgreSQL geographic indexes.

18. BOOKING CONCURRENCY

This is extremely important.

The system must protect against:

Double booking

Race conditions

Duplicate payments

Duplicate booking requests

Concurrent slot reservation

Use:

Database transactions

Unique constraints where applicable

Appropriate transaction isolation

Idempotency keys for payment/booking operations

Server-side validation

Never trust:

frontend availability

frontend price

frontend role

frontend payment status

Everything must be validated server-side.

19. PRICING ENGINE

Do not hard-code pricing.

Design a pricing system that can support:

Normal price

Weekend price

Peak-hour price

Off-peak price

Holiday price

Special event price

Owner-specific pricing

Example:

Monday 10 AM:

800 BDT

Friday 8 PM:

1500 BDT

Saturday 6 PM:

1800 BDT

The backend must calculate the final price.

The frontend should only display the calculated price.

20. BOOKING STATUS

Create a proper state machine.

Example:

PENDING_PAYMENT
↓
CONFIRMED
↓
CHECKED_IN
↓
COMPLETED

Alternative states:

CANCELLED
EXPIRED
REFUNDED
REJECTED

Prevent invalid state transitions.

21. BOOKING EXPIRATION

When a customer starts checkout but does not complete payment:

Do not keep the slot permanently blocked.

Create temporary reservation logic.

Example:

Slot reserved for:

10 minutes

If payment is not completed:

Reservation expires.

The slot becomes available again.

22. SECURITY

Implement production-grade security.

Include:

Helmet

CORS

Rate limiting where appropriate

Request validation

Zod validation

Secure cookies

CSRF protection where applicable

SQL injection protection through Prisma

Authentication middleware

Authorization middleware

Role-based access control

Input sanitization

File upload validation

Image size limits

MIME type validation

Audit logging

Never trust client-provided:

user ID

owner ID

role

price

commission

payment status

23. ROLE-BASED ACCESS CONTROL

Roles:

CUSTOMER
TURF_OWNER
ADMIN

Create reusable authorization middleware.

Example:

requireAuth()

requireRole("ADMIN")

requireRole("TURF_OWNER")

requireRole("CUSTOMER")

A Turf Owner must only be able to access their own:

Turfs

Schedules

Bookings

Revenue

Images

Settings

A customer must only access their own:

Bookings

Profile

Payments

Favorites

Admin can access platform-wide resources.

24. ARCHITECTURE

Use a Feature-Based Modular Architecture.

Do NOT create one giant controllers folder.

Recommended backend structure:

src/
├── app/
│ ├── app.ts
│ ├── routes.ts
│ └── middleware/
│
├── config/
│ ├── env.ts
│ └── database.ts
│
├── modules/
│ ├── auth/
│ ├── users/
│ ├── turfs/
│ ├── schedules/
│ ├── bookings/
│ ├── payments/
│ ├── commissions/
│ ├── reviews/
│ ├── favorites/
│ ├── notifications/
│ ├── admin/
│ └── dashboard/
│
├── shared/
│ ├── errors/
│ ├── middleware/
│ ├── utils/
│ ├── types/
│ └── services/
│
├── infrastructure/
│ ├── database/
│ ├── email/
│ ├── payment/
│ └── storage/
│
└── server.ts

Each feature should follow:

module/
├── controller.ts
├── service.ts
├── repository.ts
├── routes.ts
├── schema.ts
├── types.ts
└── mapper.ts

Use Dependency Injection where it improves testability and maintainability.

25. REPOSITORY PATTERN

Use the Repository Pattern for database access.

Example:

TurfRepository
BookingRepository
PaymentRepository
UserRepository

Controllers must not directly contain Prisma queries.

Preferred flow:

Route
→ Controller
→ Service
→ Repository
→ Prisma
→ PostgreSQL

Business rules belong in services.

Database access belongs in repositories.

26. FRONTEND ARCHITECTURE

Use Next.js with a feature-oriented structure.

Example:

src/
├── app/
│ ├── (public)/
│ ├── (auth)/
│ ├── dashboard/
│ │ ├── customer/
│ │ ├── owner/
│ │ └── admin/
│ ├── turfs/
│ └── booking/
│
├── components/
│ ├── ui/
│ ├── layout/
│ ├── turf/
│ ├── booking/
│ ├── map/
│ └── dashboard/
│
├── features/
│ ├── auth/
│ ├── turf/
│ ├── booking/
│ ├── payment/
│ └── dashboard/
│
├── lib/
├── hooks/
├── services/
├── types/
└── config/

Keep API communication centralized.

27. UI / UX

The website should feel like a modern sports marketplace.

Design inspiration:

Premium sports booking platform

Modern football/cricket aesthetic

Strong visual hierarchy

Large turf images

Location-focused search

Clean cards

Modern dashboard

Mobile-first responsive design

Use:

Framer Motion

Smooth page transitions

Card hover animations

Animated filters

Skeleton loading

Animated booking flow

Smooth modal transitions

Number counters

Subtle scroll animations

Micro-interactions

Animations must be professional.

Do NOT overuse animations.

Performance must remain high.

28. LANDING PAGE

Create a premium landing page.

Sections:

Hero

Search turf

Nearby turfs

Popular turfs

Football turfs

Cricket turfs

How it works

Why choose us

Featured turf owners

Customer reviews

Become a turf owner

FAQ

Footer

Hero example:

"Find. Book. Play."

Search:

[Location] [Sport] [Date] [Search]

Add animated sports visuals.

29. TURF SEARCH PAGE

Create a professional marketplace search interface.

Desktop:

Left:
Filters

Right:
Turf results

Filters:

Distance

Sport

Price

Rating

Facilities

Available time

Turf type

Include:

Map view

List view

Sort by distance

Sort by rating

Sort by price

Mobile should have a bottom/filter drawer.

30. TURF DETAILS PAGE

Display:

Image gallery

Turf name

Rating

Location

Distance

Facilities

Description

Rules

Available dates

Available slots

Price

Owner information

Reviews

Booking widget:

Select date
↓
Select time
↓
Price
↓
Advance payment
↓
Book now

31. OWNER ONBOARDING

Create a professional Turf Owner registration/onboarding flow.

Steps:

Create account

Verify email

Owner profile

Business information

Turf information

Location

Facilities

Images

Pricing

Schedule

Submit for approval

Admin can approve the listing.

32. CUSTOMER BOOKING EXPERIENCE

The booking experience should be extremely simple.

Example:

Customer opens turf.

Select:

Date:
Saturday

Time:
7:00 PM - 8:00 PM

Price:

2000 BDT

Advance:

600 BDT

Remaining:

1400 BDT

Click:

"Book Now"

Then:

Booking Summary
→ Payment
→ Payment verification
→ Booking confirmed

Show confirmation page with:

Booking ID

Turf

Date

Time

Amount paid

Remaining amount

Booking status

33. NOTIFICATIONS

Support notifications for:

Customer

Email verification

Booking confirmed

Payment successful

Booking cancelled

Booking reminder

Refund processed

Turf Owner

New booking

Booking cancellation

Payment received

New review

Admin

New turf submitted

New owner registration

Payment issue

Dispute

Create a notification abstraction so additional channels can be added later.

34. REVIEWS & RATINGS

Customers can review a turf after completing a booking.

Rules:

Only customers with completed bookings can review

One review per completed booking

Rating 1–5

Optional comment

Admin moderation capability

Calculate:

Average rating

Review count

35. FAVORITES

Customers can save turfs.

Features:

Add favorite

Remove favorite

View favorite list

36. IMAGE STORAGE

Do not store large image binaries directly inside PostgreSQL.

Use an object/image storage provider.

Store:

URL

public ID/key

metadata

Support:

Multiple turf images

Image deletion

Image ordering

Thumbnail/optimized versions

37. API DESIGN

Create RESTful APIs.

Examples:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/session

GET /api/turfs
GET /api/turfs/:id
POST /api/turfs
PATCH /api/turfs/:id
DELETE /api/turfs/:id

GET /api/turfs/nearby

GET /api/turfs/:id/availability

POST /api/bookings
GET /api/bookings/:id
GET /api/bookings/my
POST /api/bookings/:id/cancel

POST /api/payments
POST /api/payments/verify

GET /api/owner/dashboard
GET /api/admin/dashboard
GET /api/customer/dashboard

Use proper HTTP status codes.

38. ERROR HANDLING

Create a centralized error system.

Example:

AppError

ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
PaymentError

Use centralized Express error middleware.

Never expose:

stack traces

database errors

secrets

internal implementation details

in production responses.

Return consistent API responses.

Example:

{
"success": false,
"message": "Booking slot is no longer available",
"code": "BOOKING_SLOT_UNAVAILABLE"
}

39. LOGGING

Implement structured server-side logging.

Log:

Authentication events

Booking events

Payment events

Errors

Admin actions

Important security events

Never log:

passwords

authentication secrets

payment secrets

sensitive tokens

40. AUDIT LOG

Create AuditLog functionality.

Track important administrative/business operations.

Example:

Admin approved turf.

Store:

actor

action

entity

entity ID

timestamp

metadata

Examples:

TURF_APPROVED
TURF_REJECTED
OWNER_SUSPENDED
BOOKING_CANCELLED
COMMISSION_CHANGED

41. ENVIRONMENT VARIABLES

Use environment variables for:

DATABASE_URL

BETTER_AUTH_SECRET

BETTER_AUTH_URL

FRONTEND_URL

API_URL

GOOGLE_CLIENT_ID

GOOGLE_CLIENT_SECRET

EMAIL_HOST

EMAIL_PORT

EMAIL_USER

EMAIL_PASSWORD

PAYMENT_PROVIDER_KEY

STORAGE credentials

Never commit secrets.

Provide:

.env.example

42. DEVELOPMENT & PRODUCTION

Provide:

Development configuration

Production configuration

Environment validation

Database migrations

Seed scripts

Production build

Graceful shutdown

Health check endpoint

Example:

GET /health

Response:

{
"status": "ok"
}

43. API SECURITY

Every protected endpoint must verify authentication.

Every resource must verify ownership.

Example:

A Turf Owner should NOT be able to call:

GET /api/bookings/123

and see another owner's booking.

Authorization must happen server-side.

Do not rely on frontend route protection alone.

44. FRONTEND AUTHORIZATION

Next.js should provide route protection for user experience.

Example:

/dashboard/customer
/dashboard/owner
/dashboard/admin

Redirect unauthorized users appropriately.

But remember:

Frontend authorization is not security.

Backend authorization remains mandatory.

45. SEO

Public turf pages should be SEO-friendly.

Implement:

Metadata

Dynamic metadata

Open Graph

Sitemap

Robots.txt

SEO-friendly slugs

Example:

/turfs/dhaka/abc-football-arena

46. PERFORMANCE

Optimize for production.

Use:

Server components where appropriate

Dynamic imports

Image optimization

Pagination

Cursor pagination where useful

Database indexes

Efficient Prisma queries

API caching where appropriate

Debounced location/search requests

Never load thousands of turfs in one API response.

47. PAGINATION

All large collections must be paginated.

Examples:

Turfs

Bookings

Users

Payments

Reviews

Audit logs

Support:

page/limit for simple admin interfaces

cursor pagination where appropriate

48. VALIDATION

Use Zod.

Validate:

Request body

Query parameters

Route parameters

Authentication input

Booking input

Payment input

Turf creation

Turf schedule

Profile data

Validation must happen on the backend.

49. TESTING REQUIREMENTS

Write tests for critical business rules.

Especially:

Booking

Can book available slot

Cannot double-book

Cannot book unavailable slot

Cannot book past date

Expired payment reservation

Correct price calculation

Correct commission calculation

Authorization

Customer cannot access another customer

Owner cannot access another owner

Owner cannot modify another owner's turf

Customer cannot access admin routes

Payment

Successful payment

Failed payment

Duplicate payment callback

Payment verification

Idempotency

50. BUSINESS RULES

Implement these rules carefully.

Turf must be approved before appearing publicly.

Only active turf owners can manage active turfs.

Customers cannot book unavailable slots.

Customers cannot book past slots.

Booking price is calculated by backend.

Commission is calculated by backend.

Historical booking financial data never changes when pricing/commission policy changes.

Payment success must be verified server-side.

Booking confirmation must depend on verified payment.

Expired unpaid reservations release the slot.

Owners can only manage their own resources.

Customers can only manage their own bookings.

Admin has platform-wide permissions.

Reviews require a completed booking.

Cancellation/refund rules must be configurable.

51. CANCELLATION POLICY

Create configurable cancellation policies.

Example:

More than 24 hours before booking:
100% advance refund

12–24 hours:
50% refund

Less than 12 hours:
No refund

Do not hard-code these values.

Store policies/configuration so Admin can modify them.

52. DATA OWNERSHIP

Use strict ownership checks.

Example:

TurfOwner A

can access:

Turf A
Booking A
Revenue A

but cannot access:

TurfOwner B's Turf
TurfOwner B's bookings
TurfOwner B's revenue

This must be enforced at service/repository level.

53. DATABASE TRANSACTION EXAMPLE

Booking creation should conceptually follow:

BEGIN TRANSACTION

Validate customer

Validate turf

Validate schedule

Validate slot availability

Calculate price

Calculate advance payment

Calculate commission

Create temporary booking/reservation

Create payment record

Commit

Payment confirmation:

BEGIN TRANSACTION

Verify payment provider

Validate transaction

Check idempotency

Update payment

Confirm booking

Create commission record

Create notification

Commit

54. CLEAN CODE REQUIREMENTS

Follow:

SOLID

DRY

Separation of concerns

Dependency inversion

Single responsibility

Repository pattern

Service layer

DTO/schema validation

Centralized error handling

Avoid:

Giant controllers

Giant services

Prisma queries everywhere

Business logic in routes

Business logic in React components

Hard-coded configuration

Duplicate validation

Duplicate payment logic

55. DELIVERABLES

Generate the project in stages.

Phase 1

Project setup:

Next.js frontend

Express backend

TypeScript

PostgreSQL

Prisma

Better Auth

Environment configuration

Phase 2

Authentication:

Registration

Login

Logout

Email verification

Password reset

Google login

Cookie sessions

RBAC

Phase 3

Turf management:

Owner onboarding

Turf CRUD

Images

Facilities

Location

Approval workflow

Phase 4

Scheduling:

Operating hours

Slots

Pricing

Blocked dates

Availability API

Phase 5

Booking:

Booking flow

Slot reservation

Concurrency protection

Booking state machine

Cancellation

Phase 6

Payment:

Partial payment

Payment abstraction

Payment verification

Refunds

Idempotency

Phase 7

Commission:

Commission policy

Commission calculation

Owner earnings

Platform revenue

Phase 8

Dashboards:

Customer

Turf Owner

Admin

Phase 9

Search & Location:

Nearby turfs

Map

Filters

Distance calculation

Phase 10

Reviews, favorites, notifications and audit logs.

Phase 11

UI animations, responsive design, SEO and performance optimization.

Phase 12

Testing, security review, database optimization and production deployment.

56. IMPORTANT DEVELOPMENT RULE

Do not generate everything as one giant response.

Build the project incrementally.

For every phase:

Explain the architecture briefly.

Show the folder structure.

Create the required files.

Provide complete working code.

Explain how the files connect.

Provide database migration commands.

Provide required environment variables.

Provide API examples where useful.

Verify consistency with previously generated code.

Do not unnecessarily rewrite working code from previous phases.

Never create fake implementations such as:

// TODO: implement later


for core functionality.

Core production functionality must be implemented.

If an external service requires credentials, provide the integration code and clearly identify the required environment variables.

57. FINAL ARCHITECTURE

The final system should conceptually be:

                ┌──────────────────────┐
                │      NEXT.JS         │
                │   Customer Website   │
                │   Owner Dashboard    │
                │   Admin Dashboard    │
                └──────────┬───────────┘
                           │
                     HTTPS + Cookies
                           │
                           ▼
                ┌──────────────────────┐
                │    EXPRESS API       │
                │      NODE.JS         │
                ├──────────────────────┤
                │ Auth                 │
                │ Users                │
                │ Turfs                │
                │ Schedules            │
                │ Bookings             │
                │ Payments             │
                │ Commission           │
                │ Reviews              │
                │ Notifications        │
                │ Admin                │
                └──────────┬───────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌────────────┐ ┌──────────────┐ ┌──────────────┐
    │ PostgreSQL │ │ Email Service│ │ Payment      │
    │ + Prisma   │ │ Node.js      │ │ Provider     │
    └────────────┘ └──────────────┘ └──────────────┘

                   │
                   ▼
            ┌──────────────┐
            │ Image Storage│
            └──────────────┘


58. PRIMARY OBJECTIVE

The final application should feel like a real commercial product rather than a student project.

Prioritize:

Correct booking logic

Secure authentication

Reliable payment processing

Multi-vendor architecture

Accurate commission calculation

Concurrent booking protection

Excellent UX

Mobile responsiveness

Scalable architecture

Maintainable code

Strong database design

Security

Performance

The application must be capable of evolving into a large-scale sports booking marketplace.

Start with Phase 1: production project architecture, repository structure, PostgreSQL/Prisma schema foundation, Express setup, Next.js setup, and Better Auth configuration.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/711261e0-6cba-42f2-bf62-d600760b32d1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
