import { httpClient } from './http-client';
import type {
  ListCustomersParams,
  PaginatedCustomersResponse,
  CustomerDetailsResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UpdateCustomerStatusRequest,
  CustomerMutationResponse,
} from '../types/customers.types';

export class CustomersService {
  private readonly baseUrl = '/customers';

  async listCustomers(params?: ListCustomersParams): Promise<PaginatedCustomersResponse> {
    const { data } = await httpClient.get<PaginatedCustomersResponse>(this.baseUrl, { params });
    return data;
  }

  async getCustomerById(id: string): Promise<CustomerDetailsResponse> {
    const { data } = await httpClient.get<CustomerDetailsResponse>(`${this.baseUrl}/${id}`);
    return data;
  }

  async createCustomer(payload: CreateCustomerRequest): Promise<CustomerMutationResponse> {
    const { data } = await httpClient.post<CustomerMutationResponse>(this.baseUrl, payload);
    return data;
  }

  async updateCustomer(id: string, payload: UpdateCustomerRequest): Promise<CustomerMutationResponse> {
    const { data } = await httpClient.patch<CustomerMutationResponse>(`${this.baseUrl}/${id}`, payload);
    return data;
  }

  async updateCustomerStatus(id: string, payload: UpdateCustomerStatusRequest): Promise<CustomerMutationResponse> {
    const { data } = await httpClient.patch<CustomerMutationResponse>(`${this.baseUrl}/${id}/status`, payload);
    return data;
  }
}

export const customersService = new CustomersService();
