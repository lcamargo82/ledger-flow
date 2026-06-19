export type CustomerType = 'INDIVIDUAL' | 'COMPANY';

export type CustomerStatusFilter = 'all' | 'active' | 'inactive';

export type CustomerTypeFilter = 'all' | CustomerType;

export interface CustomerListItem {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  document?: string | null;
  phone?: string | null;
  type: CustomerType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetailsResponse {
  customer: CustomerListItem;
}

export interface PaginatedCustomersMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginatedCustomersResponse {
  data: CustomerListItem[];
  meta: PaginatedCustomersMeta;
}

export interface ListCustomersParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: CustomerStatusFilter;
  type?: CustomerTypeFilter;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string | null;
  document?: string | null;
  phone?: string | null;
  type?: CustomerType;
  active?: boolean;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string | null;
  document?: string | null;
  phone?: string | null;
  type?: CustomerType;
}

export interface UpdateCustomerStatusRequest {
  active: boolean;
}

export interface CustomerMutationResponse {
  customer: CustomerListItem;
}
