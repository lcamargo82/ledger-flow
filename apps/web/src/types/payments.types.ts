export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'PIX'
  | 'BOLETO'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'OTHER';

export interface PaymentCustomerSummary {
  id: string;
  name: string;
}

export interface PaymentEvent {
  id: string;
  type: string;
  previousStatus?: PaymentStatus | null;
  currentStatus?: PaymentStatus | null;
  message?: string | null;
  createdAt: string;
}

export interface PaymentListItem {
  id: string;
  reference: string;
  customer: PaymentCustomerSummary;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface PaymentDetails extends PaymentListItem {
  updatedAt: string;
  canceledAt?: string | null;
  refundedAt?: string | null;
  events: PaymentEvent[];
}

export interface PaginatedPaymentsMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPaymentsResponse {
  data: PaymentListItem[];
  meta: PaginatedPaymentsMeta;
}

export interface PaymentDetailsResponse {
  payment: PaymentDetails;
}

export interface PaymentInstructions {
  provider: string;
  paymentId: string;
  providerPaymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  providerStatus?: string | null;
  dueDate?: string | null;
  expiresAt?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeBase64?: string | null;
  paymentUrl?: string | null;
  isExpired: boolean;
  canCancel: boolean;
  canRefresh: boolean;
}

export interface PaymentInstructionsResponse {
  instructions: PaymentInstructions;
}


export interface ListPaymentsParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: PaymentStatus | 'all';
  method?: PaymentMethod | 'all';
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreatePaymentRequest {
  customerId: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResponse {
  payment: PaymentDetails | PaymentListItem;
}

export interface CancelPaymentResponse {
  payment: PaymentDetails | PaymentListItem;
}
