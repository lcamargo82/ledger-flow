import { httpClient } from './http-client';
import type {
  ListPaymentsParams,
  PaginatedPaymentsResponse,
  PaymentDetailsResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  CancelPaymentResponse,
  PaymentInstructionsResponse,
} from '../types/payments.types';

export class PaymentsService {
  private readonly baseUrl = '/payments';

  async listPayments(params?: ListPaymentsParams): Promise<PaginatedPaymentsResponse> {
    const { data } = await httpClient.get<PaginatedPaymentsResponse>(this.baseUrl, { params });
    return data;
  }

  async getPaymentById(id: string): Promise<PaymentDetailsResponse> {
    const { data } = await httpClient.get<PaymentDetailsResponse>(`${this.baseUrl}/${id}`);
    return data;
  }

  async getPaymentInstructions(id: string): Promise<PaymentInstructionsResponse> {
    const { data } = await httpClient.get<PaymentInstructionsResponse>(`${this.baseUrl}/${id}/instructions`);
    return data;
  }

  async createPayment(payload: CreatePaymentRequest, idempotencyKey: string): Promise<CreatePaymentResponse> {
    const { data } = await httpClient.post<CreatePaymentResponse>(this.baseUrl, payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return data;
  }

  async cancelPayment(id: string): Promise<CancelPaymentResponse> {
    const { data } = await httpClient.post<CancelPaymentResponse>(`${this.baseUrl}/${id}/cancel`);
    return data;
  }

  async retryExternalCharge(id: string): Promise<PaymentDetailsResponse> {
    const { data } = await httpClient.post<PaymentDetailsResponse>(`${this.baseUrl}/${id}/retry-external-charge`);
    return data;
  }
}

export const paymentsService = new PaymentsService();
