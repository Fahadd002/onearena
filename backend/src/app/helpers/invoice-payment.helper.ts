import { InvoiceStatus, PaymentStatus, Prisma } from "../../generated/prisma/client";


export function calculateInvoiceStatus(
  paidAmount: Prisma.Decimal | number,
  totalAmount: Prisma.Decimal | number
): InvoiceStatus {
  const paid = Number(paidAmount);
  const total = Number(totalAmount);

  if (paid >= total) return InvoiceStatus.PAID;
  if (paid > 0) return InvoiceStatus.PARTIALLY_PAID;
  return InvoiceStatus.UNPAID;
}

export function calculatePaymentStatusFromInvoice(
  paidAmount: Prisma.Decimal | number,
  totalAmount: Prisma.Decimal | number
): PaymentStatus {
  const paid = Number(paidAmount);
  const total = Number(totalAmount);

  if (paid >= total) return PaymentStatus.PAID;
  if (paid > 0) return PaymentStatus.PARTIALLY_PAID;
  return PaymentStatus.UNPAID;
}

export function sumPayments(
  payments: { amount: Prisma.Decimal | number }[]
): Prisma.Decimal {
  return payments.reduce(
    (sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())),
    new Prisma.Decimal(0)
  );
}

export function isInvoiceFullyPaid(
  paidAmount: Prisma.Decimal | number,
  totalAmount: Prisma.Decimal | number
): boolean {
  return Number(paidAmount) >= Number(totalAmount);
}

export interface InvoiceTotals {
  paidAmount: Prisma.Decimal;
  status: InvoiceStatus;
  isFullPaid: boolean;
}

export function computeInvoiceTotals(
  successfulPayments: Array<{ amount: Prisma.Decimal | number; [key: string]: any }>,
  totalAmount: Prisma.Decimal | number
): InvoiceTotals {
  const paidAmount = sumPayments(successfulPayments);
  const isFullPaid = isInvoiceFullyPaid(paidAmount, totalAmount);
  const status = calculateInvoiceStatus(paidAmount, totalAmount);

  return { paidAmount, status, isFullPaid };
}

export function filterSuccessfulPayments<T extends { status: PaymentStatus; amount: Prisma.Decimal | number }>(
  payments: T[]
): T[] {
  return payments.filter((p) => p.status === PaymentStatus.SUCCEEDED);
}