import { Payment, PaymentEvent, Prisma } from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface ListPaymentsParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  method?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface IPaymentsRepository {
  findPaginated(params: ListPaymentsParams): Promise<PaginatedResult<Payment>>;

  findByIdAndTenant(id: string, tenantId: string): Promise<Payment | null>;

  findByIdAndTenantWithEvents(
    id: string,
    tenantId: string,
  ): Promise<(Payment & { events: PaymentEvent[] }) | null>;

  findByIdempotencyKeyHash(tenantId: string, idempotencyKeyHash: string): Promise<Payment | null>;

  create(data: Prisma.PaymentUncheckedCreateInput, outboxEventData?: any): Promise<Payment>;

  cancel(
    id: string,
    tenantId: string,
    eventData: Prisma.PaymentEventUncheckedCreateWithoutPaymentInput,
  ): Promise<Payment>;

  refund(
    id: string,
    tenantId: string,
    eventData: Prisma.PaymentEventUncheckedCreateWithoutPaymentInput,
  ): Promise<Payment>;

  createEvent(data: Prisma.PaymentEventUncheckedCreateInput): Promise<PaymentEvent>;
}
