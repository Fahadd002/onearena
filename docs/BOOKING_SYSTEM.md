# OneArena Booking System - Technical Specification

**Last Updated:** 2026-09-10  
**Purpose:** Authoritative specification for the OneArena Booking system architecture and business rules.  
**Audience:** AI coding agents, backend engineers, and system architects.

---

## 1. System Overview

The OneArena Booking system manages the complete lifecycle of turf slot reservations, from player selection through payment collection and game completion.

### Entity Hierarchy

```
Turf (sports venue)
  └── TurfSlot (specific time slot on a date)
      └── Booking (player's reservation of a slot)
          └── BookingInvoice (financial record for the booking)
              └── Payment (individual payment toward the invoice)
                  └── Refund (refund of a payment)
```

### Entity Responsibilities

| Entity | Responsibility |
|--------|-----------------|
| **Turf** | Sports venue with price rules, facilities, and available slots |
| **TurfSlot** | Specific date/time slot within a turf; tracks availability status |
| **Booking** | Player's reservation request; tracks lifecycle from reservation to completion |
| **BookingInvoice** | Single financial record per booking; totals all payments and refunds |
| **Payment** | Individual payment transaction (cash advance, remaining, refund adjustment) |
| **Refund** | Refund of a previous payment; maintains payment history immutability |

---

## 2. Relationship Rules

### Prisma Schema Relationships

```
Turf
  │
  └─── TurfSlot (1:N)
       │
       ├─ Booking (1:1 via slotId, unique)
       │  │
       │  ├─ BookingInvoice (1:1 via bookingId, unique)
       │  │  │
       │  │  └─ Payment (1:N via invoiceId)
       │  │     │
       │  │     └─ Refund (1:N via paymentId)
       │  │
       │  └─ Refund (1:N via bookingId)
       │
       └─ User (owner)

Payment
  │
  └─ Refund (1:N via paymentId)

Booking
  │
  ├─ User (player)
  ├─ TurfSlot
  ├─ BookingInvoice
  └─ Refund (1:N)
```

### Critical Rules

```text
✓ TurfSlot → Booking: ONE-TO-ONE (unique slotId)
✓ Booking → BookingInvoice: ONE-TO-ONE (unique bookingId)
✓ BookingInvoice → Payment: ONE-TO-MANY (invoiceId)
✓ Payment → Refund: ONE-TO-MANY (paymentId)
✓ Booking → Refund: ONE-TO-MANY (bookingId) [for audit trail]

✗ Booking → Payment: MUST NOT exist as direct relation
  └─ All payments traced through: Booking → BookingInvoice → Payment
  └─ DO NOT add bookingId to Payment table
  └─ Payment has invoiceId only
```

---

## 3. Booking Lifecycle

### Status Flow Diagram

```
┌─────────────┐
│  AVAILABLE  │ (Initial slot state - no booking exists)
└──────┬──────┘
       │ Player initiates booking
       ▼
┌─────────────┐
│ PREBOOKED   │ (Booking created, waiting for admin confirmation)
└──────┬──────┘
       │
       ├─ [Admin confirms]──→ ┌──────────────┐
       │                      │  CONFIRMED   │ (Admin approved, invoice created)
       │                      └──────┬───────┘
       │                             │
       │                             ├─ [Game starts]──→ ┌────────────┐
       │                             │                   │ KICKED_OFF │ (Active game/session)
       │                             │                   └──────┬─────┘
       │                             │                          │
       │                             │                          ├─ [Game ends]──→ ┌───────────┐
       │                             │                          │                 │ COMPLETED │
       │                             │                          │                 └───────────┘
       │                             │                          │
       │                             │                          └─ [Cancel]──→ CANCELLED
       │                             │
       │                             └─ [Admin rejects]→ CANCELLED
       │
       ├─ [Admin rejects]──────→ CANCELLED
       │
       └─ [Timeout (auto-expire)]──→ EXPIRED
```

### Status Definitions

| Status | Business Meaning | Slot State | Invoice State | Payment Allowed |
|--------|-----------------|-----------|---------------|-----------------|
| **PREBOOKED** | Player booked slot, awaiting admin confirmation | RESERVED | None | No |
| **CONFIRMED** | Admin approved, booking confirmed, payment collection active | BOOKED | UNPAID/PARTIALLY_PAID | Yes |
| **KICKED_OFF** | Game/session has started | BOOKED | Any | Yes (if not full) |
| **COMPLETED** | Game/session finished successfully | BOOKED | Any | No (completed) |
| **CANCELLED** | Booking cancelled (player/admin), slot released | AVAILABLE | Any | No |
| **EXPIRED** | Payment timeout, auto-cancelled, slot released | AVAILABLE | UNPAID | No |

### Important Business Rules

- **Payment does NOT change booking status**: A fully paid invoice does NOT automatically move booking to COMPLETED
- **Admin explicitly transitions booking**: Admin must explicitly transition CONFIRMED → KICKED_OFF → COMPLETED
- **Cancellation allowed only before KICKED_OFF**: Once game starts, cancellation blocked (unless explicit refund process)
- **One slot = One booking**: Slot becomes AVAILABLE again only when booking is CANCELLED or EXPIRED

---

## 4. Slot Lifecycle

### Status Flow Diagram

```
┌──────────────┐
│  AVAILABLE   │ (Slot open for booking)
└──────┬───────┘
       │ Player creates booking
       ▼
┌──────────────┐
│  RESERVED    │ (Slot reserved, waiting for admin confirmation)
└──────┬───────┘
       │
       ├─ [Admin confirms booking]──→ ┌───────┐
       │                               │ BOOKED│ (Confirmed, paid, or being paid)
       │                               └───────┘
       │
       └─ [Booking cancelled/expired]──→ AVAILABLE
```

### Status Definitions

| Status | Meaning | Booking Exists | Can Create New Booking |
|--------|---------|------------------|-----|
| **AVAILABLE** | Slot unallocated, open for new bookings | No | Yes |
| **RESERVED** | Slot claimed by booking (PREBOOKED), awaiting confirmation | Yes (PREBOOKED) | No |
| **BOOKED** | Slot confirmed, booking active | Yes (CONFIRMED/KICKED_OFF/COMPLETED) | No |

### Critical Rules

- **Double-booking prevention**: Only one booking per slot at any time
- **Reserve-to-Book transition**: Only admin confirmation moves RESERVED → BOOKED
- **Release on rejection/expiry**: RESERVED → AVAILABLE only on booking CANCELLED or EXPIRED

---

## 5. Booking Creation Flow

### Current Implementation (⚠️ INCORRECT)

```text
Player selects slot
       ↓
POST /bookings
       ↓
Backend validates slot
       ↓
Backend calculates price
       ↓
[PROBLEM] Create Booking
          status = PREBOOKED
          [PROBLEM] ALSO create BookingInvoice
          [PROBLEM] ALSO create Payment
       ↓
Slot = PREBOOKED (should be RESERVED)
       ↓
Return Booking to client
```

### Target Implementation

```text
Player selects slot
       ↓
POST /bookings
       ↓
Backend validates:
  ├─ Turf is ACTIVE
  ├─ Slot exists and is AVAILABLE
  ├─ Booking date is valid (current or future)
  └─ Using idempotencyKey to prevent duplicates
       ↓
Backend calculates:
  ├─ Base slot price from TurfSlot or Turf
  ├─ Apply dynamic pricing rules (TurfPriceRule)
  ├─ Apply discounts (if any)
  └─ Total amount
       ↓
[CORRECT] Create Booking ONLY
  ├─ status = PREBOOKED
  ├─ totalAmount = calculated price
  ├─ bookingExpiresAt = now + 15 minutes (config)
  └─ NO invoice created yet
       ↓
[CORRECT] Update Slot
  └─ slotStatus = RESERVED (NOT PREBOOKED)
       ↓
Return Booking to client
  (No invoice, no payment data)
```

### API Specification

**Endpoint:** `POST /bookings`  
**Auth:** USER (logged-in player)  
**Request Body:**
```json
{
  "turfId": "uuid",
  "slotId": "uuid",
  "bookingDate": "YYYY-MM-DD",
  "startMinute": 0,
  "endMinute": 90,
  "mobile": "+8801712345678",
  "idempotencyKey": "uuid-or-unique-string"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "bookingNumber": "TRF-2026-001",
  "userId": "uuid",
  "slotId": "uuid",
  "status": "PREBOOKED",
  "baseAmount": 2000.00,
  "totalAmount": 2000.00,
  "bookingExpiresAt": "2026-09-10T14:30:00Z",
  "createdAt": "2026-09-10T14:15:00Z"
}
```

### Important Rules

- **NO invoice during booking creation**: Invoice must be created only during admin confirmation
- **Slot becomes RESERVED**: Not PREBOOKED (PREBOOKED is only for Booking status)
- **Expiration timer starts**: Booking auto-cancels if not confirmed before `bookingExpiresAt`
- **Idempotency**: Same `idempotencyKey` within same booking returns existing booking (prevents duplicate bookings)

---

## 6. Admin Confirmation Flow

### Target Implementation

```text
Admin/Owner/Manager reviews booking
       ↓
PATCH /bookings/{bookingId}/confirm
       ↓
Backend validates:
  ├─ Booking exists and status = PREBOOKED
  ├─ Slot still available (RESERVED status)
  ├─ Current user has permission
  ├─ Slot has not expired
  └─ Within transaction context
       ↓
Database Transaction:
  ├─ Update Booking
  │  └─ status = CONFIRMED
  │
  ├─ Update TurfSlot
  │  └─ slotStatus = BOOKED
  │
  └─ Create BookingInvoice
     ├─ invoiceNumber = unique
     ├─ totalAmount = from Booking.totalAmount
     ├─ paidAmount = 0
     ├─ status = UNPAID
     └─ (first payment record removed, payments only on manual payment endpoint)
       ↓
Return Booking with Invoice
```

### API Specification

**Endpoint:** `POST /bookings/{bookingId}/confirm`  
**Auth:** ADMIN, OWNER, MANAGER (with BOOKING_MANAGE permission)  
**Request Body:** (empty or minimal)
```json
{
  "notes": "optional confirmation notes"
}
```

**Response (200 OK):**
```json
{
  "booking": {
    "id": "uuid",
    "status": "CONFIRMED",
    "totalAmount": 2000.00,
    "createdAt": "2026-09-10T14:15:00Z"
  },
  "invoice": {
    "id": "uuid",
    "bookingId": "uuid",
    "invoiceNumber": "INV-2026-1234567890",
    "totalAmount": 2000.00,
    "paidAmount": 0,
    "status": "UNPAID",
    "createdAt": "2026-09-10T14:20:00Z"
  }
}
```

### Reject Flow

**Endpoint:** `POST /bookings/{bookingId}/reject`  
**Auth:** ADMIN, OWNER, MANAGER  
**Request Body:**
```json
{
  "reason": "Slot no longer available"
}
```

**Behavior:**
```text
Booking status = PREBOOKED
       ↓
PATCH /bookings/{bookingId}/reject
       ↓
Transaction:
  ├─ Delete Booking (or set status = CANCELLED + reason)
  ├─ Update TurfSlot
  │  └─ slotStatus = AVAILABLE
  └─ No invoice was created yet (PREBOOKED state)
       ↓
Response: Booking with status = CANCELLED
```

---

## 7. Invoice Rules

### One-to-One Relationship

```text
Booking (1) ←─→ (1) BookingInvoice
  ├─ Booking.id is unique key in BookingInvoice (bookingId)
  ├─ Created only on booking confirmation
  └─ Exactly one invoice per booking (immutable)
```

### Invoice Lifecycle

```
Booking PREBOOKED
    └─ Invoice: None

Booking CONFIRMED
    ├─ Invoice created
    ├─ paidAmount = 0
    ├─ status = UNPAID
    └─ No payments yet

After Payment #1 (Advance = ৳500)
    ├─ paidAmount = 500
    └─ status = PARTIALLY_PAID

After Payment #2 (Remaining = ৳1,500)
    ├─ paidAmount = 2,000
    └─ status = PAID
```

### Invoice Schema (Current)

```prisma
model BookingInvoice {
  id            String        @id @default(uuid())
  bookingId     String        @unique
  invoiceNumber String        @unique
  invoiceDate   DateTime      @default(now())
  
  subtotal      Decimal       @db.Decimal(12, 2)
  discount      Decimal       @default(0) @db.Decimal(12, 2)
  totalAmount   Decimal       @db.Decimal(12, 2)
  paidAmount    Decimal       @default(0) @db.Decimal(12, 2)
  
  isFullPaid    Boolean       @default(false)
  status        PaymentStatus @default(UNPAID)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  booking       Booking       @relation(fields: [bookingId], references: [id])
  payments      Payment[]
}
```

### Automatic Invoice Updates

Invoice fields automatically updated when payments are processed:

| Trigger | Field | Calculation |
|---------|-------|-------------|
| Payment created/updated | `paidAmount` | `SUM(payment.amount WHERE payment.status = SUCCEEDED)` |
| `paidAmount` changes | `status` | See Invoice Payment State (section 11) |
| `paidAmount` >= `totalAmount` | `isFullPaid` | `true` |

### Critical Rules

- **Created only on confirmation**: No invoice before booking confirmation
- **Exactly one per booking**: Cannot create multiple invoices for single booking
- **Admin must NOT manually create invoices**: Automatically created during confirmation
- **Immutable totalAmount**: Once created, `totalAmount` should not change
- **New payments do NOT create new invoice**: Use `POST /bookings/{id}/payments/manual` to add payments

---

## 8. Payment Rules

### One-to-Many Relationship

```text
BookingInvoice (1) ←─→ (N) Payment
  ├─ Each payment has invoiceId
  ├─ Multiple payments possible for single invoice
  └─ Payments cumulative (do NOT overwrite)
```

### Payment Workflow

For invoice with totalAmount = ৳2,000:

```text
Payment #1: Advance
├─ type = ADVANCE
├─ method = CASH
├─ amount = 500
├─ status = SUCCEEDED
├─ paidAt = 2026-09-10T10:00:00Z
└─ receivedById = manager-uuid

Payment #2: Remaining
├─ type = REMAINING
├─ method = CASH
├─ amount = 1,500
├─ status = SUCCEEDED
├─ paidAt = 2026-09-10T11:00:00Z
└─ receivedById = manager-uuid

Total Paid: 500 + 1,500 = 2,000 ✓
```

### Payment Methods & Types

**Payment Method (PaymentMethod enum):**
- `BKASH` (online)
- `ROKET` (online)
- `NAGAD` (online)
- `CASH` (manual)
- `OTHERS` (manual)

**Payment Type (PaymentType enum):**
- `ADVANCE` - first/partial payment toward invoice
- `REMAINING` - payment of remaining balance
- `FULL` - payment of entire amount

### Payment Status

**Current (⚠️ Needs cleanup):**
- `PENDING` - awaiting processing (should be for online only)
- `PROCESSING` - processing by gateway (online only)
- `SUCCEEDED` - payment successful and recorded
- `FAILED` - payment failed
- `CANCELLED` - payment cancelled
- `REFUNDED` - entire payment refunded
- `PARTIALLY_REFUNDED` - partial refund of payment
- `UNPAID` - (invoice status, should not be on Payment)
- `PARTIALLY_PAID` - (invoice status, should not be on Payment)

**Recommended:**
- Use `SUCCEEDED` for all manual cash payments immediately
- Use `PENDING/PROCESSING/SUCCEEDED` for online-gateway payments only

### Payment Schema (Current)

```prisma
model Payment {
  id                String         @id @default(uuid())
  paymentNumber     String         @unique
  invoiceId         String
  invoice           BookingInvoice @relation(fields: [invoiceId], references: [id])
  
  type              PaymentType
  method            PaymentMethod
  amount            Decimal        @db.Decimal(12, 2)
  status            PaymentStatus  @default(PENDING)
  
  // Manual payment
  receivedById      String?
  reference         String?        // e.g., check number, receipt #
  note              String?
  paidAt            DateTime?
  receivedBy        User?          @relation("PaymentReceivedBy", fields: [receivedById], references: [id])
  
  // Online payment gateway
  providerTransactionId  String?   @unique
  paymentIntentId        String?   @unique
  checkoutSessionId      String?   @unique
  
  idempotencyKey    String         @unique
  rawEventId        String?        @unique
  
  failureCode       String?
  failureMessage    String?
  
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  refunds           Refund[]
}
```

### Critical Rules

- **Manual payments active**: Cash payments recorded immediately with status = SUCCEEDED
- **Online payments disabled**: Stripe/gateway code exists but must NOT be called in current phase
- **No overpayment**: Reject if `amount > (invoice.totalAmount - SUM(successful payments))`
- **Immutable history**: Payments never deleted or overwritten
- **Idempotency**: Same payment transaction should not duplicate (use `idempotencyKey`)

---

## 9. Payment Collection

### Workflow

Payment collection is a **separate workflow** independent of booking creation. It occurs after:

1. Booking is CONFIRMED
2. BookingInvoice is created
3. Admin/Manager ready to collect payment

### Timeline Example

```text
T1: Player books slot
    └─ Booking = PREBOOKED
    └─ No invoice, no payment

T2: Admin confirms booking
    ├─ Booking = CONFIRMED
    ├─ Slot = BOOKED
    └─ Invoice = UNPAID (paidAmount = 0)

T3: Admin collects advance (after kickoff if needed)
    └─ POST /bookings/{id}/payments/manual
    └─ Payment #1 created
    └─ Invoice.paidAmount = 500
    └─ Invoice.status = PARTIALLY_PAID

T4: Admin collects remaining
    └─ POST /bookings/{id}/payments/manual
    └─ Payment #2 created
    └─ Invoice.paidAmount = 2,000
    └─ Invoice.status = PAID

T5: Game in progress
    └─ Booking status can be KICKED_OFF
    └─ Payment collection still possible

T6: Game finished
    └─ Admin updates booking
    └─ Booking = COMPLETED
    └─ No further payments allowed
```

### Manual Payment Endpoint

**Endpoint:** `POST /bookings/{bookingId}/payments/manual`  
**Auth:** ADMIN, MANAGER, OWNER (with BOOKING_MANAGE permission)  
**Request:**
```json
{
  "amount": 500,
  "method": "CASH",
  "reference": "Receipt-001",
  "note": "Advance payment collected at venue"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "paymentNumber": "PAY-2026-001",
  "invoiceId": "uuid",
  "type": "ADVANCE",
  "method": "CASH",
  "amount": 500,
  "status": "SUCCEEDED",
  "receivedById": "manager-uuid",
  "paidAt": "2026-09-10T10:30:00Z"
}
```

### Validation Rules

```javascript
// Get invoice
invoice = GET /bookings/{bookingId}/invoice

// Calculate successful payments
successfulPayments = SUM(payments WHERE status = SUCCEEDED)
paidAmount = successfulPayments
remainingAmount = invoice.totalAmount - paidAmount

// Validate new payment
if (amount <= 0) REJECT("Amount must be > 0")
if (amount > remainingAmount) REJECT("Exceeds remaining balance")

// Create payment
// Set type = ADVANCE if paidAmount == 0, else REMAINING
// Set status = SUCCEEDED (manual payments are immediate)
// Set receivedById = current user
```

---

## 10. Payment Validation

### Total Paid Calculation

```javascript
successfulPayments = 
  Payment[]
  .filter(p => p.status === SUCCEEDED)
  .sum(amount)
```

### Remaining Balance

```javascript
remaining = invoice.totalAmount - successfulPayments
```

### Validation on New Payment

```javascript
if (amount <= 0) {
  throw new AppError(400, "Amount must be > 0")
}

if (amount > remaining) {
  throw new AppError(400, `Amount exceeds remaining: ${remaining}`)
}
```

### Transaction Requirements

Payment creation must happen in a **Prisma transaction** to prevent:

1. **Race condition**: Two concurrent payments both validating against old balance
2. **Overpayment**: Two payments processing simultaneously exceed total

```prisma
prisma.$transaction(async (tx) => {
  // Re-fetch latest successful payment sum (locks row)
  const latestSum = await tx.payment.aggregate({
    where: { invoiceId, status: SUCCEEDED },
    _sum: { amount: true },
  })
  
  const remaining = invoice.totalAmount - (latestSum._sum.amount ?? 0)
  
  if (amount > remaining) {
    throw new Error("Overpayment")
  }
  
  // Create payment
  const payment = await tx.payment.create({ data: {...} })
  
  // Update invoice paidAmount
  await tx.bookingInvoice.update({
    where: { id: invoiceId },
    data: { 
      paidAmount: newSum,
      status: newStatus 
    },
  })
  
  return payment
})
```

---

## 11. Invoice Payment State

### Invoice Status Determination

Invoice status is **derived** from payment totals, not stored in booking.

```javascript
function calculateInvoiceStatus(invoice: BookingInvoice): PaymentStatus {
  const successfulPayments = 
    invoice.payments
    .filter(p => p.status === SUCCEEDED)
    .sum(amount)
  
  if (successfulPayments === 0) {
    return UNPAID
  }
  
  if (successfulPayments < invoice.totalAmount) {
    return PARTIALLY_PAID
  }
  
  if (successfulPayments >= invoice.totalAmount) {
    return PAID
  }
}
```

### Status Matrix

| Scenario | paidAmount | Status |
|----------|-----------|--------|
| No payments | 0 | UNPAID |
| ৳500 / ৳2,000 | 500 | PARTIALLY_PAID |
| ৳2,000 / ৳2,000 | 2,000 | PAID |
| ৳2,500 / ৳2,000 | 2,500 | PAID (overpaid, should be rejected) |

### Implementation Notes

- **Booking.paymentStatus deprecated**: Do NOT use `Booking.paymentStatus` to track payment
- **Invoice.status is authoritative**: Always derive from invoice and payments
- **Field `isFullPaid`**: Keep for backward compatibility but maintain via trigger
- **Add PAID enum**: Currently PaymentStatus lacks `PAID` (has `PARTIALLY_PAID` but not final `PAID`)

---

## 12. Refund Rules

### Refund Workflow

```text
Payment (successfully collected)
    ↓
Player/Admin requests refund
    ↓
POST /bookings/{id}/refunds
    ├─ paymentId
    ├─ amount <= payment.amount
    ├─ reason
    └─ requestedBy (user ID)
    ↓
Refund created
    ├─ status = REQUESTED
    ├─ paymentId (links to original payment)
    ├─ bookingId (audit trail)
    └─ amount
    ↓
Admin reviews refund
    ↓
PATCH /refunds/{refundId}
    ├─ Approve: status = APPROVED, then PROCESSED
    ├─ Reject: status = REJECTED
    └─ Actual refund processing (external payment gateway) happens separately
```

### Refund Schema

```prisma
model Refund {
  id          String         @id @default(uuid())
  paymentId   String
  bookingId   String
  
  amount      Decimal        @db.Decimal(12, 2)
  reason      String?
  status      RefundStatus   @default(REQUESTED)
  
  requestedBy String
  processedBy String?
  processedAt DateTime?
  
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  payment     Payment        @relation(fields: [paymentId], references: [id])
  booking     Booking        @relation(fields: [bookingId], references: [id])
}
```

### Refund Status Flow

```
REQUESTED (created)
    ↓
    ├─ [Approve] → APPROVED → PROCESSED (refund to payment method)
    └─ [Reject] → REJECTED
```

### Critical Rules

- **Original payment immutable**: Never delete or modify the original Payment record
- **Refund references payment**: `Refund.paymentId` points to original Payment
- **Total refunds <= payment amount**: Sum of refunds for one payment ≤ payment amount
- **Audit trail**: Both `paymentId` and `bookingId` stored for tracking
- **Status must be SUCCEEDED**: Only refund payments with status = SUCCEEDED

---

## 13. Complete Business Example

### Scenario

Turf slot price: **৳2,000**  
Booking time: Monday 6:00 PM - 7:30 PM  
Booking expires if not confirmed: 15 minutes

### Timeline

**10:00 AM** - Player books slot

```
POST /bookings
{
  "turfId": "turf-abc",
  "slotId": "slot-xyz",
  "bookingDate": "2026-09-14",
  "startMinute": 1080,
  "endMinute": 1170,
  "mobile": "+8801712345678",
  "idempotencyKey": "player-uuid-timestamp"
}

Response:
{
  "id": "booking-123",
  "bookingNumber": "TRF-2026-001",
  "status": "PREBOOKED",
  "totalAmount": 2000,
  "bookingExpiresAt": "2026-09-10T10:15:00Z",
  "createdAt": "2026-09-10T10:00:00Z"
}

DB Changes:
  Booking.create(id=booking-123, status=PREBOOKED, totalAmount=2000)
  TurfSlot.update(slotStatus=RESERVED) [NOT PREBOOKED]
  BookingInvoice: NONE YET
  Payment: NONE YET
```

**10:05 AM** - Admin reviews and confirms booking

```
POST /bookings/booking-123/confirm

Response:
{
  "booking": {
    "id": "booking-123",
    "status": "CONFIRMED",
    "totalAmount": 2000
  },
  "invoice": {
    "id": "invoice-456",
    "bookingId": "booking-123",
    "invoiceNumber": "INV-2026-1234567890",
    "totalAmount": 2000,
    "paidAmount": 0,
    "status": "UNPAID",
    "createdAt": "2026-09-10T10:05:00Z"
  }
}

DB Changes:
  Booking.update(status=CONFIRMED)
  TurfSlot.update(slotStatus=BOOKED)
  BookingInvoice.create(totalAmount=2000, paidAmount=0, status=UNPAID)
  Payment: NONE YET (no auto-payment)
```

**6:00 PM (same day)** - Admin collects advance payment at venue

```
POST /bookings/booking-123/payments/manual
{
  "amount": 500,
  "method": "CASH",
  "reference": "Receipt-001",
  "note": "Advance collected at venue"
}

Response:
{
  "id": "payment-001",
  "paymentNumber": "PAY-2026-001",
  "invoiceId": "invoice-456",
  "type": "ADVANCE",
  "method": "CASH",
  "amount": 500,
  "status": "SUCCEEDED",
  "receivedById": "manager-uuid",
  "paidAt": "2026-09-10T18:00:00Z"
}

DB Changes:
  Payment.create(invoiceId=invoice-456, amount=500, status=SUCCEEDED)
  BookingInvoice.update(paidAmount=500, status=PARTIALLY_PAID)
```

**6:05 PM** - Game kicks off

```
PATCH /bookings/booking-123/kick-off

Response:
{
  "id": "booking-123",
  "status": "KICKED_OFF",
  "totalAmount": 2000
}

DB Changes:
  Booking.update(status=KICKED_OFF)
```

**7:20 PM** - Admin collects remaining payment

```
POST /bookings/booking-123/payments/manual
{
  "amount": 1500,
  "method": "CASH",
  "reference": "Receipt-002",
  "note": "Remaining collected before game end"
}

Response:
{
  "id": "payment-002",
  "paymentNumber": "PAY-2026-002",
  "invoiceId": "invoice-456",
  "type": "REMAINING",
  "method": "CASH",
  "amount": 1500,
  "status": "SUCCEEDED",
  "receivedById": "manager-uuid",
  "paidAt": "2026-09-10T19:20:00Z"
}

DB Changes:
  Payment.create(invoiceId=invoice-456, amount=1500, status=SUCCEEDED)
  BookingInvoice.update(paidAmount=2000, status=PAID, isFullPaid=true)
```

**7:30 PM** - Game ends

```
PATCH /bookings/booking-123/complete

Response:
{
  "id": "booking-123",
  "status": "COMPLETED",
  "totalAmount": 2000
}

DB Changes:
  Booking.update(status=COMPLETED)
```

### Final State

| Entity | Value |
|--------|-------|
| **Booking** | status=COMPLETED, totalAmount=2000 |
| **Slot** | slotStatus=BOOKED (remains) |
| **Invoice** | totalAmount=2000, paidAmount=2000, status=PAID, isFullPaid=true |
| **Payment #1** | amount=500, type=ADVANCE, status=SUCCEEDED |
| **Payment #2** | amount=1500, type=REMAINING, status=SUCCEEDED |
| **Total Collected** | 500 + 1500 = 2000 ✓ |

---

## 14. API Responsibilities

### Booking Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/bookings` | POST | USER | Create new booking (PREBOOKED state) |
| `/bookings` | GET | USER/ADMIN/MANAGER | List bookings with filters |
| `/bookings/{id}` | GET | USER/ADMIN/MANAGER | Get single booking details |
| `/bookings/{id}/confirm` | POST | ADMIN/MANAGER | Confirm booking → CONFIRMED + create invoice |
| `/bookings/{id}/reject` | POST | ADMIN/MANAGER | Reject booking → CANCELLED |
| `/bookings/{id}/cancel` | DELETE | USER | Player cancels own booking |
| `/bookings/{id}/kick-off` | POST | ADMIN/MANAGER | Start game → KICKED_OFF |
| `/bookings/{id}/complete` | POST | ADMIN/MANAGER | Mark game finished → COMPLETED |

### Invoice Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/bookings/{id}/invoice` | GET | USER/ADMIN/MANAGER | Get invoice for booking |
| `/invoices` | GET | ADMIN/MANAGER | List all invoices (with filters) |

### Payment Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/bookings/{id}/payments/manual` | POST | ADMIN/MANAGER | Record manual cash payment |
| `/bookings/{id}/payments` | GET | USER/ADMIN/MANAGER | List payments for booking |
| `/bookings/{id}/checkout` | POST | USER | Create Stripe checkout (DISABLED for now) |

### Refund Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/bookings/{id}/refunds` | POST | ADMIN/MANAGER | Request refund |
| `/bookings/{id}/refunds` | GET | USER/ADMIN/MANAGER | List refunds for booking |
| `/refunds/{id}` | PATCH | ADMIN | Approve/reject refund |

---

## 15. Authorization

### Role Permissions Matrix

| Action | USER | ADMIN | MANAGER | SUPER_ADMIN |
|--------|------|-------|---------|------------|
| Create own booking | ✓ | ✗ | ✗ | ✗ |
| View own bookings | ✓ | ✗ | ✗ | ✗ |
| Cancel own booking | ✓ | ✗ | ✗ | ✗ |
| View all bookings (owned turf) | ✗ | ✓ | ✓* | ✗ |
| Confirm booking | ✗ | ✓ | ✓* | ✓ |
| Reject booking | ✗ | ✓ | ✓* | ✓ |
| Collect manual payment | ✗ | ✓ | ✓* | ✓ |
| Kick-off game | ✗ | ✓ | ✓* | ✓ |
| Complete game | ✗ | ✓ | ✓* | ✓ |
| Process refund | ✗ | ✓ | ✓* | ✓ |

\* **MANAGER**: Must have `BOOKING_MANAGE` permission for the specific turf

### Authorization Rules

```javascript
// Player (USER) operations
if (action === "cancel_own_booking") {
  if (user.role !== USER || booking.userId !== user.userId) {
    FORBIDDEN
  }
}

// Admin operations
if (action === "confirm_booking") {
  if (user.role === ADMIN) {
    // Must own the turf
    if (booking.slot.turf.ownerId !== user.userId) FORBIDDEN
  } else if (user.role === MANAGER) {
    // Must have BOOKING_MANAGE permission
    const hasPermission = await checkManagerPermission(
      user.userId,
      booking.slot.turfId,
      "BOOKING_MANAGE"
    )
    if (!hasPermission) FORBIDDEN
  } else {
    FORBIDDEN
  }
}
```

---

## 16. Transaction Rules

### Operations Requiring Transactions

All state-changing operations must use `prisma.$transaction()` to ensure atomicity:

| Operation | What's Transacted | Why |
|-----------|------------------|-----|
| **Create Booking** | Booking + Slot update | Prevent double-booking |
| **Confirm Booking** | Booking + Slot + Invoice | Ensure invoice created only once |
| **Reject/Cancel Booking** | Booking + Slot release | Prevent leaked slots |
| **Record Payment** | Payment + Invoice update | Prevent overpayment and race conditions |
| **Process Refund** | Refund + Payment status | Maintain financial consistency |
| **Expire Booking** | Booking deletion + Slot release | Atomic cleanup |
| **Auto-expire unpaid** | Batch delete + Slot updates | Consistent state |

### Example: Payment Creation Transaction

```typescript
return prisma.$transaction(async (tx) => {
  // 1. Fetch latest payment sum (acquires row lock)
  const successfulPayments = await tx.payment.aggregate({
    where: { invoiceId, status: PaymentStatus.SUCCEEDED },
    _sum: { amount: true },
  })
  
  const paidAmount = Number(successfulPayments._sum.amount ?? 0)
  const remaining = invoice.totalAmount - paidAmount
  
  // 2. Validate (double-check in transaction)
  if (amount > remaining) {
    throw new Error("Overpayment")
  }
  
  // 3. Create payment
  const payment = await tx.payment.create({
    data: {
      invoiceId,
      amount,
      status: PaymentStatus.SUCCEEDED,
      type: paidAmount === 0 ? PaymentType.ADVANCE : PaymentType.REMAINING,
      // ... other fields
    },
  })
  
  // 4. Update invoice
  const newPaidAmount = paidAmount + amount
  await tx.bookingInvoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount: newPaidAmount,
      status: calculateInvoiceStatus(newPaidAmount, invoice.totalAmount),
      isFullPaid: newPaidAmount >= invoice.totalAmount,
    },
  })
  
  return payment
})
```

---

## 17. Database Design

### Relationship Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                            User                              │
│ (id, name, email, role, ...)                                │
└────────────┬──────────────────────────────────────────────────┘
             │
             │ 1:N (ownerId)
             ▼
        ┌────────────┐
        │    Turf    │
        │ (id, ownerId,
        │  name, basePrice, ...)
        └────────────┘
             │
             │ 1:N (turfId)
             ▼
        ┌────────────────┐
        │   TurfSlot     │
        │ (id, turfId,
        │  slotDate, startMinute,
        │  endMinute, price,
        │  slotStatus)
        └────────────────┘
             │
             │ 1:1 (slotId unique)
             ▼
        ┌────────────────┐
        │    Booking     │
        │ (id, slotId,
        │  userId, status,
        │  totalAmount,
        │  bookingExpiresAt)
        └────────────────┘
             │
             ├─ 1:N (userId) → User
             ├─ 1:1 (slotId) ← TurfSlot
             ├─ 1:1 (bookingId) → BookingInvoice
             │         │
             │         │ 1:N (invoiceId)
             │         ▼
             │    ┌─────────────────┐
             │    │ BookingInvoice  │
             │    │ (id, bookingId,
             │    │  totalAmount,
             │    │  paidAmount,
             │    │  status)
             │    └─────────────────┘
             │         │
             │         │ 1:N (invoiceId)
             │         ▼
             │    ┌──────────────┐
             │    │  Payment     │
             │    │ (id, invoiceId,
             │    │  amount, type,
             │    │  method, status)
             │    └──────────────┘
             │         │
             │         │ 1:N (paymentId)
             │         ▼
             │    ┌──────────────┐
             │    │   Refund     │
             │    │ (id, paymentId,
             │    │  amount,
             │    │  status)
             │    └──────────────┘
             │
             └─ 1:N (bookingId) → Refund
```

### Critical Constraints

```text
✓ TurfSlot.slotId: PRIMARY KEY
✓ Booking.slotId: UNIQUE (one booking per slot)
✓ BookingInvoice.bookingId: UNIQUE (one invoice per booking)
✓ Payment.invoiceId: Foreign key (not unique)
✓ Refund.paymentId: Foreign key (not unique)
✓ Refund.bookingId: Foreign key (audit trail)

✗ DO NOT add Booking.paymentId
✗ DO NOT add Payment.bookingId
✗ DO NOT create Booking 1:N Payment
  └─ All payment links must go through BookingInvoice
```

### Indexes

```prisma
// Booking quick lookups
@@index([userId, createdAt])
@@index([status, createdAt])
@@index([bookingExpiresAt])

// Slot availability
@@index([turfId, slotDate, slotStatus])
@@index([turfId, slotDate, active])

// Payment tracking
@@index([invoiceId, paidAt])

// Refund tracking
@@index([paymentId, status])
@@index([bookingId, status])
```

---

## 18. Rules for Future AI Agents

### Before Any Modifications

1. **Read this document first** - Always consult this spec before modifying Booking-related code
2. **Treat as source of truth** - This document defines business rules; the database/code must follow it
3. **Validate against this spec** - After changes, verify implementation matches all sections

### Booking/Payment Relationships

4. **No direct Booking → Payment** - Payments must always be accessed through `Booking → BookingInvoice → Payment`
5. **Never add bookingId to Payment** - This violates the schema; use invoiceId only
6. **One invoice per booking** - Cannot create multiple invoices for single booking
7. **Immutable payment records** - Never delete/update payments; record refunds separately

### Booking & Invoice Creation

8. **No invoice during booking creation** - Invoice exists only after confirmation (PREBOOKED → CONFIRMED)
9. **No payment during booking creation** - First payment happens via `/bookings/{id}/payments/manual`
10. **Slot becomes RESERVED** - Not PREBOOKED; PREBOOKED is only a Booking status

### Invoice & Payment Rules

11. **One payment per transaction** - Each call to `/payments/manual` creates one Payment record
12. **Prevent overpayment** - Reject if amount > (totalAmount - SUM(successful payments))
13. **Use transactions** - All financial operations (payment, refund, confirmation) must use `prisma.$transaction()`
14. **Keep payment immutable** - Never overwrite or delete payments

### Gateway Integration

15. **Stripe disabled by default** - Existing Stripe code must remain but MUST NOT be activated
16. **Manual cash only** - Current phase uses `PaymentMethod.CASH` and `receivedById` tracking
17. **Manual payments = immediate** - Use `status = SUCCEEDED` for cash payments (no pending state)

### Schema Constraints

18. **Do not modify schema structure** - Do NOT add `Booking.payment[]` or `Payment.bookingId`
19. **Check existing enums** - Use `BookingStatus`, `SlotStatus`, `PaymentStatus` as defined
20. **Add missing enums if needed** - `SlotStatus` should have RESERVED; `PaymentStatus` should have PAID

### Architecture & Patterns

21. **No Booking → Commission** - Do not add commission relation to Booking (separate system)
22. **Preserve existing patterns** - Follow project's `prisma.$transaction`, guard/decorator patterns
23. **Avoid over-engineering** - Use simple relations; don't create abstraction layers
24. **One responsibility per function** - Keep services focused (BookingService, PaymentService, etc.)

### Implementation Validation

25. **Run after changes** - Execute `npx prisma generate` and `npm run build` after schema changes
26. **Test transactions** - Write tests for concurrent payment operations to verify no race conditions
27. **Validate authorization** - Verify role-based access control on every endpoint
28. **Document deviations** - If you must deviate from this spec, document why and get approval

### Testing Checklist

29. **Create booking flow** - Player books → PREBOOKED → no invoice/payment
30. **Confirm flow** - Admin confirms → CONFIRMED → invoice created → UNPAID
31. **Payment collection** - Collect ৳500 → PARTIALLY_PAID, then ৳1,500 → PAID
32. **Slot transitions** - Verify slot status follows: AVAILABLE → RESERVED → BOOKED
33. **Cancellation** - Cancel booking → CANCELLED → slot released to AVAILABLE
34. **Expiration** - Wait for bookingExpiresAt → auto-cancel → slot released
35. **Refund workflow** - Refund payment → track with Refund record (not by deleting Payment)
36. **Concurrent payments** - Two simultaneous payment requests → verify overpayment check

---

## Current Implementation vs. Target Conflicts

### CRITICAL ISSUES

#### Issue 1: Invoice Created During Booking

**Current:**
```typescript
// In booking.service.ts - create() method
await tx.bookingInvoice.create({
  data: {
    bookingId: booking.id,
    invoiceNumber: ...,
    totalAmount: total,
    paidAmount: 0,
    status: PaymentStatus.UNPAID,
  },
});
```

**Target:** Invoice created ONLY during confirmation, not during booking

**Fix Required:** Remove invoice creation from `BookingService.create()`, add to `BookingService.confirm()` (not yet implemented)

---

#### Issue 2: Payment Created During Booking

**Current:**
```typescript
// In booking.service.ts - create() method
await tx.payment.create({
  data: {
    bookingId: booking.id,  // WRONG!
    type: PaymentType.FULL,
    method: PaymentMethod.CASH,
    status: PaymentStatus.PENDING,
    amount: total,
    idempotencyKey: payload.idempotencyKey,
  },
});
```

**Problems:**
1. Payment created immediately (should only during manual collection)
2. Payment references `bookingId` (should reference `invoiceId`)
3. No invoice yet exists to reference

**Target:** Payment never created during booking. Only during `/bookings/{id}/payments/manual`

**Fix Required:**
1. Remove payment creation from booking flow
2. Verify Payment schema has no `bookingId` field (confirmed: only `invoiceId`)
3. Create `PaymentService.manualPayment()` endpoint (partially exists)

---

#### Issue 3: Slot Status Should Be "RESERVED" Not "PREBOOKED"

**Current:**
```typescript
// In booking.service.ts - create() method
await tx.turfSlot.update({
  where: { id: payload.slotId },
  data: { slotStatus: SlotSatus.PREBOOKED },  // WRONG!
});
```

**Schema Issue:**
```prisma
enum SlotSatus {
  PREBOOKED   // ← Should be for Booking status only
  BOOKED
  AVAILABLE
  // Missing: RESERVED
}
```

**Target:**
- `SlotStatus.RESERVED` = slot booked but not yet confirmed (Booking is PREBOOKED)
- `SlotStatus.BOOKED` = slot confirmed (Booking is CONFIRMED or KICKED_OFF or COMPLETED)
- `SlotStatus.AVAILABLE` = no booking

**Fix Required:**
1. Add `RESERVED` to `SlotStatus` enum
2. Change booking creation to set slot to `RESERVED`
3. Change confirmation to change slot from `RESERVED` to `BOOKED`

---

#### Issue 4: Confirm/Reject Endpoints Not Implemented

**Current:** No confirmation logic exists

**Target Endpoints Needed:**
- `POST /bookings/{id}/confirm` - Transition PREBOOKED → CONFIRMED + create invoice
- `POST /bookings/{id}/reject` - Transition PREBOOKED → CANCELLED + release slot

**Fix Required:** Implement confirmation flow with transaction

---

#### Issue 5: Booking Lifecycle Endpoints Incomplete

**Current:** Only `DELETE` for cancel, no kick-off/complete

**Target Endpoints Needed:**
- `POST /bookings/{id}/kick-off` - Transition CONFIRMED → KICKED_OFF
- `POST /bookings/{id}/complete` - Transition KICKED_OFF → COMPLETED

**Fix Required:** Add booking status transition endpoints

---

### MODERATE ISSUES

#### Issue 6: `Booking.paymentStatus` Field

**Current:** Booking has `paymentStatus` field being used to track payment state

**Target:** Booking status should NOT track payment state. Use `BookingInvoice.status` only.

**Fix Required:** Deprecated `Booking.paymentStatus` (may cause breaking changes) or keep for compatibility and ensure invoice status is canonical

---

#### Issue 7: Missing `PAID` Status

**Current PaymentStatus enum:**
```
PENDING, PROCESSING, FAILED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED, UNPAID, PARTIALLY_PAID
```

**Missing:** `PAID` (for when paidAmount >= totalAmount)

**Fix Required:** Add `PAID` to `PaymentStatus` enum

---

#### Issue 8: Missing `RESERVED` Slot Status

**Current:** Only PREBOOKED, BOOKED, AVAILABLE

**Missing:** RESERVED (for PREBOOKED bookings)

**Fix Required:** Add `RESERVED` to `SlotStatus` enum

---

#### Issue 9: Online Payment Endpoint Active

**Current:** `/bookings/{id}/checkout` endpoint calls Stripe

**Target:** Must be disabled (code kept for future use)

**Fix Required:** Flag endpoint as disabled or return error until explicitly enabled

---

### MINOR ISSUES

#### Issue 10: Authorization on Invoice Endpoints

**Current:** Invoice endpoints may not have complete role checks

**Target:** Verify USER can only see own bookings, ADMIN/MANAGER see owned turfs

**Fix Required:** Complete authorization matrix for all invoice/payment endpoints

---

#### Issue 11: Refund Endpoints Incomplete

**Current:** Refund schema exists but endpoints may be missing

**Target:** Implement refund workflow with approval process

**Fix Required:** Add refund endpoints if missing

---

#### Issue 12: Payment Status Logic

**Current:** Uses both `PENDING`, `PROCESSING` for manual payments

**Target:** Manual cash payments should immediately be `SUCCEEDED`

**Fix Required:** Adjust `PaymentService.manualPayment()` to set status = SUCCEEDED

---

## Summary Table: Current vs. Target

| Aspect | Current | Target | Status |
|--------|---------|--------|--------|
| Invoice on booking | ✓ Created | ✗ None | ❌ CONFLICT |
| Payment on booking | ✓ Created | ✗ None | ❌ CONFLICT |
| Slot status on booking | PREBOOKED | RESERVED | ❌ NEEDS ENUM |
| Confirm endpoint | ✗ Missing | ✓ Implement | ❌ TODO |
| Reject endpoint | ✗ Missing | ✓ Implement | ❌ TODO |
| Kick-off endpoint | ✗ Missing | ✓ Implement | ❌ TODO |
| Complete endpoint | ✗ Missing | ✓ Implement | ❌ TODO |
| Payment→Invoice relation | ✓ Correct (invoiceId) | ✓ Correct | ✅ OK |
| Booking→Payment relation | Unused yet | ✗ Must not exist | ⚠️ CHECK |
| Manual payment endpoint | Partial | ✓ Full flow | ⚠️ NEEDS WORK |
| Stripe endpoint | ✓ Active | ✗ Disabled | ⚠️ FLAG |
| Booking.paymentStatus field | ✓ Used | Deprecated | ⚠️ COMPATIBLE |
| PAID enum status | ✗ Missing | ✓ Add | ❌ NEEDS ENUM |
| RESERVED slot status | ✗ Missing | ✓ Add | ❌ NEEDS ENUM |

---

## Appendix A: PaymentStatus Enum Reference

### Recommended Enum Definition

```prisma
enum PaymentStatus {
  // Manual payment states
  SUCCEEDED          // Cash payment completed
  
  // Online payment states
  PENDING            // Awaiting gateway processing
  PROCESSING         // Being processed by gateway
  FAILED             // Payment failed
  
  // Refund states
  REFUNDED           // Entire payment refunded
  PARTIALLY_REFUNDED // Partial refund issued
  
  // Invoice states (deprecated on Payment, use on BookingInvoice)
  CANCELLED          // Payment cancelled
}
```

### Invoice-Only Statuses

```prisma
// Only use these on BookingInvoice, NOT on Payment
enum InvoiceStatus {
  UNPAID            // paidAmount = 0
  PARTIALLY_PAID    // 0 < paidAmount < totalAmount
  PAID              // paidAmount >= totalAmount
}
```

---

## Appendix B: Sample Booking Service Methods

### Pseudo-code for Target Implementation

```typescript
// 1. Create booking (PREBOOKED, no invoice/payment)
async create(user, payload): Booking {
  return tx {
    booking = create Booking(
      status: PREBOOKED,
      totalAmount: calculated_price,
      bookingExpiresAt: now + 15min
    )
    slot = update TurfSlot(slotStatus: RESERVED)
    return booking
  }
}

// 2. Confirm booking (PREBOOKED → CONFIRMED + create invoice)
async confirm(user, bookingId): {booking, invoice} {
  booking = fetch Booking(id=bookingId, status=PREBOOKED)
  slot = fetch TurfSlot(id=booking.slotId, slotStatus=RESERVED)
  
  return tx {
    booking = update Booking(status: CONFIRMED)
    slot = update TurfSlot(slotStatus: BOOKED)
    invoice = create BookingInvoice(
      bookingId,
      totalAmount: booking.totalAmount,
      paidAmount: 0,
      status: UNPAID
    )
    return {booking, invoice}
  }
}

// 3. Reject booking (PREBOOKED → CANCELLED)
async reject(user, bookingId): Booking {
  booking = fetch Booking(id=bookingId, status=PREBOOKED)
  
  return tx {
    booking = update Booking(status: CANCELLED)
    slot = update TurfSlot(slotStatus: AVAILABLE)
    return booking
  }
}

// 4. Record manual payment
async manualPayment(user, bookingId, {amount, method}): Payment {
  booking = fetch Booking(id=bookingId, status=CONFIRMED)
  invoice = fetch BookingInvoice(bookingId)
  
  successfulPayments = sum(Payment where invoiceId=invoice.id && status=SUCCEEDED)
  remaining = invoice.totalAmount - successfulPayments
  
  if (amount > remaining) throw ERROR
  
  return tx {
    payment = create Payment(
      invoiceId: invoice.id,
      amount,
      status: SUCCEEDED,
      type: (successfulPayments == 0) ? ADVANCE : REMAINING,
      receivedById: user.id,
      paidAt: now
    )
    
    newPaidAmount = successfulPayments + amount
    newStatus = calculateInvoiceStatus(newPaidAmount, invoice.totalAmount)
    
    invoice = update BookingInvoice(
      paidAmount: newPaidAmount,
      status: newStatus,
      isFullPaid: (newPaidAmount >= invoice.totalAmount)
    )
    
    return payment
  }
}

// 5. Kick off game
async kickOff(user, bookingId): Booking {
  booking = fetch Booking(id=bookingId, status=CONFIRMED)
  return update Booking(status: KICKED_OFF)
}

// 6. Complete game
async complete(user, bookingId): Booking {
  booking = fetch Booking(id=bookingId, status=KICKED_OFF)
  return update Booking(status: COMPLETED)
}
```

---

## Appendix C: Key Links in Project

- **Backend Booking Service:** `backend/src/app/modules/booking/booking.service.ts`
- **Backend Booking Controller:** `backend/src/app/modules/booking/booking.controller.ts`
- **Payment Service:** `backend/src/app/modules/payment/payment.service.ts`
- **Invoice Service:** `backend/src/app/modules/invoice/invoice.service.ts`
- **Prisma Turf Schema:** `backend/prisma/schema/turfschema.prisma`
- **Prisma Enums:** `backend/prisma/schema/enums.prisma`

---

## Document Version History

| Date | Author | Changes |
|------|--------|---------|
| 2026-09-10 | System | Initial comprehensive specification |

---

**End of Document**

This document is the authoritative specification for the OneArena Booking System. All code changes must comply with the rules and architecture defined herein. Treat this document as the single source of truth for booking business logic.
