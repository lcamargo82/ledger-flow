import { Customer } from '@prisma/client';

export interface PaginatedCustomersResult {
  data: Customer[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface ListCustomersParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  type?: 'INDIVIDUAL' | 'COMPANY' | 'all';
}

export const CUSTOMERS_REPOSITORY = Symbol('CUSTOMERS_REPOSITORY');

export interface CustomersRepository {
  findPaginated(params: ListCustomersParams): Promise<PaginatedCustomersResult>;
  findByIdAndTenant(id: string, tenantId: string): Promise<Customer | null>;
  findByEmailAndTenant(
    email: string,
    tenantId: string,
  ): Promise<Customer | null>;
  findByDocumentAndTenant(
    document: string,
    tenantId: string,
  ): Promise<Customer | null>;
  create(
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Customer>;
  update(
    id: string,
    tenantId: string,
    data: Partial<Customer>,
  ): Promise<Customer>;
  updateStatus(
    id: string,
    tenantId: string,
    active: boolean,
  ): Promise<Customer>;
}
