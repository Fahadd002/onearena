export interface BookingListTurfDto {
  id: string;
  name: string;
}

export interface BookingListSlotDto {
  id: string;
  slotDate: Date;
  startMinute: number;
  endMinute: number;
  price: string;
  isPeakTime: boolean;
  slotStatus: string;
  turf: BookingListTurfDto;
}

export interface BookingListPaymentDto {
  id: string;
  paymentNumber: string;
  amount: string;
  method: string;
  type: string;
  status: string;
  paidAt: Date | null;
  reference: string | null;
  note: string | null;
  payerMobileNumber: string | null;
  providerTransactionId: string | null;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  receivedBy: { id: string; name: string } | null;
  createdAt: Date;
}

export interface BookingListInvoiceDto {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceFor: string;
  subtotal: string;
  discount: string;
  totalAmount: string;
  paidAmount: string;
  isFullPaid: boolean;
  status: string;
  payments: BookingListPaymentDto[];
}

export interface BookingListItemDto {
  id: string;
  bookingNumber: string;
  userId: string;
  mobile: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  paymentStatus: string;
  baseAmount: string;
  packageAmount: string;
  discountAmount: string;
  subtotal: string;
  totalAmount: string;
  numberOfSlot: number;
  bookingExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  slots: BookingListSlotDto[];
  slot: BookingListSlotDto | null;

  invoice: BookingListInvoiceDto | null;
}

export interface PaginatedBookingListDto {
  data: BookingListItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}