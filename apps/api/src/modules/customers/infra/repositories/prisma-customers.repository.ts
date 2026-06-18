import { Injectable } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  CustomersRepository,
  ListCustomersParams,
  PaginatedCustomersResult,
} from '../../domain/repositories/customers.repository';

@Injectable()
export class PrismaCustomersRepository implements CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(
    params: ListCustomersParams,
  ): Promise<PaginatedCustomersResult> {
    const {
      tenantId,
      page = 1,
      perPage = 10,
      search,
      status = 'all',
      type = 'all',
    } = params;

    const skip = (page - 1) * perPage;
    const take = perPage > 100 ? 100 : perPage; // perPage máximo 100

    const where: Prisma.CustomerWhereInput = {
      tenantId,
    };

    if (status !== 'all') {
      where.active = status === 'active';
    }

    if (type !== 'all') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        perPage: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findByIdAndTenant(
    id: string,
    tenantId: string,
  ): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id, tenantId }, // This works because id is a unique field, but tenantId restricts it
    });
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string,
  ): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
  }

  async findByDocumentAndTenant(
    document: string,
    tenantId: string,
  ): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { tenantId_document: { tenantId, document } },
    });
  }

  async create(
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Customer> {
    return this.prisma.customer.create({
      data,
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<Customer>,
  ): Promise<Customer> {
    // We must ensure the customer belongs to the tenant before updating.
    // Prisma's update requires a unique identifier. We can use a transaction or updateMany returning.
    // Using findFirst to verify, then update.
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    active: boolean,
  ): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id },
      data: { active },
    });
  }
}
