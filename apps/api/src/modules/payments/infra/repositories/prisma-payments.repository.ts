/* eslint-disable */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { Payment, PaymentEvent, Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  IPaymentsRepository,
  ListPaymentsParams,
  PaginatedResult,
} from '../../domain/repositories/payments.repository';

@Injectable()
export class PrismaPaymentsRepository implements IPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(params: ListPaymentsParams): Promise<PaginatedResult<Payment>> {
    const {
      tenantId,
      page = 1,
      perPage = 10,
      search,
      status,
      method,
      customerId,
      dateFrom,
      dateTo,
    } = params;

    const where: Prisma.PaymentWhereInput = {
      tenantId,
      ...(status && { status: status as PaymentStatus }),
      ...(method && { method: method as any }),
      ...(customerId && { customerId }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { reference: { contains: search, mode: 'insensitive' } },
          { externalReference: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<Payment | null> {
    return this.prisma.payment
      .findUnique({
        where: { id },
      })
      .then((payment) => (payment?.tenantId === tenantId ? payment : null));
  }

  async findByIdAndTenantWithEvents(
    id: string,
    tenantId: string,
  ): Promise<(Payment & { events: PaymentEvent[] }) | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!payment || payment.tenantId !== tenantId) {
      return null;
    }

    return payment;
  }

  async findByIdempotencyKeyHash(
    tenantId: string,
    idempotencyKeyHash: string,
  ): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: {
        tenantId_idempotencyKeyHash: {
          tenantId,
          idempotencyKeyHash,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.PaymentUncheckedCreateInput, outboxEventData?: any): Promise<Payment> {
    if (outboxEventData) {
      return this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (
          outboxEventData.payload &&
          outboxEventData.payload.paymentId === 'WILL_BE_REPLACED_IN_REPOSITORY_TRANSACTION'
        ) {
          outboxEventData.payload.paymentId = payment.id;
        }

        await tx.outboxEvent.create({
          data: {
            ...outboxEventData,
            aggregateId: payment.id,
          },
        });

        return payment;
      });
    }

    return this.prisma.payment.create({
      data,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
  async cancel(
    id: string,
    tenantId: string,
    eventData: Prisma.PaymentEventUncheckedCreateWithoutPaymentInput,
  ): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id, tenantId },
        data: {
          status: PaymentStatus.CANCELED,
          canceledAt: new Date(),
          events: {
            create: eventData,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return payment;
    });
  }

  async refund(
    id: string,
    tenantId: string,
    eventData: Prisma.PaymentEventUncheckedCreateWithoutPaymentInput,
  ): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id, tenantId },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          events: {
            create: eventData,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return payment;
    });
  }

  async createEvent(data: Prisma.PaymentEventUncheckedCreateInput): Promise<PaymentEvent> {
    return this.prisma.paymentEvent.create({ data });
  }
}
