import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CUSTOMERS_REPOSITORY } from '../../domain/repositories/customers.repository';
import type { CustomersRepository } from '../../domain/repositories/customers.repository';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import {
  ListCustomersQueryDto,
  CustomerStatusQuery,
  CustomerTypeQuery,
} from '../dto/list-customers-query.dto';
import { PrismaService } from '../../../../database/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepository: CustomersRepository,
    private readonly prisma: PrismaService, // For audit logs primarily
  ) {}

  async create(
    tenantId: string,
    actorUserId: string,
    createCustomerDto: CreateCustomerDto,
  ) {
    const { email, document } = createCustomerDto;

    if (email) {
      const emailNormalized = email.trim().toLowerCase();
      createCustomerDto.email = emailNormalized;
      const existingEmail = await this.customersRepository.findByEmailAndTenant(
        emailNormalized,
        tenantId,
      );
      if (existingEmail) {
        throw new ConflictException(
          'Customer email already exists for this tenant.',
        );
      }
    }

    if (document) {
      const documentNormalized = document.replace(/\D/g, ''); // Simplest normalization
      createCustomerDto.document = documentNormalized;
      const existingDoc =
        await this.customersRepository.findByDocumentAndTenant(
          documentNormalized,
          tenantId,
        );
      if (existingDoc) {
        throw new ConflictException(
          'Customer document already exists for this tenant.',
        );
      }
    }

    const customer = await this.customersRepository.create({
      tenantId,
      name: createCustomerDto.name,
      type: createCustomerDto.type ?? 'INDIVIDUAL',
      email: createCustomerDto.email ?? null,
      document: createCustomerDto.document ?? null,
      phone: createCustomerDto.phone ?? null,
      active: createCustomerDto.active ?? true,
    });

    await this.auditLog(tenantId, actorUserId, 'customer.created', customer.id);

    return customer;
  }

  async findAll(tenantId: string, query: ListCustomersQueryDto) {
    return this.customersRepository.findPaginated({
      tenantId,
      ...query,
      status:
        query.status === CustomerStatusQuery.ALL ? undefined : query.status,
      type: query.type === CustomerTypeQuery.ALL ? undefined : query.type,
    });
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.customersRepository.findByIdAndTenant(
      id,
      tenantId,
    );
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }
    return customer;
  }

  async update(
    id: string,
    tenantId: string,
    actorUserId: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.findOne(id, tenantId);

    const { email, document } = updateCustomerDto;

    if (email && email !== customer.email) {
      const emailNormalized = email.trim().toLowerCase();
      updateCustomerDto.email = emailNormalized;
      const existingEmail = await this.customersRepository.findByEmailAndTenant(
        emailNormalized,
        tenantId,
      );
      if (existingEmail) {
        throw new ConflictException(
          'Customer email already exists for this tenant.',
        );
      }
    }

    if (document && document !== customer.document) {
      const documentNormalized = document.replace(/\D/g, '');
      updateCustomerDto.document = documentNormalized;
      const existingDoc =
        await this.customersRepository.findByDocumentAndTenant(
          documentNormalized,
          tenantId,
        );
      if (existingDoc) {
        throw new ConflictException(
          'Customer document already exists for this tenant.',
        );
      }
    }

    const updatedCustomer = await this.customersRepository.update(
      id,
      tenantId,
      updateCustomerDto,
    );

    await this.auditLog(
      tenantId,
      actorUserId,
      'customer.updated',
      updatedCustomer.id,
    );

    return updatedCustomer;
  }

  async updateStatus(
    id: string,
    tenantId: string,
    actorUserId: string,
    active: boolean,
  ) {
    const customer = await this.findOne(id, tenantId);

    if (customer.active === active) {
      return customer;
    }

    const updatedCustomer = await this.customersRepository.updateStatus(
      id,
      tenantId,
      active,
    );

    const action = active ? 'customer.activated' : 'customer.deactivated';
    await this.auditLog(tenantId, actorUserId, action, updatedCustomer.id);

    return updatedCustomer;
  }

  private async auditLog(
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'Customer',
        entityId,
      },
    });
  }
}
