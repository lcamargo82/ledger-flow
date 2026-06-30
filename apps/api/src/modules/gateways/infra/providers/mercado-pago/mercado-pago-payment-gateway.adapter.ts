/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentMethod, PaymentStatus } from '@prisma/client';
import { IPaymentGateway } from '../../../domain/interfaces/payment-gateway.interface';
import { GatewayCapabilities } from '../../../domain/interfaces/gateway-capabilities.interface';
import {
  CreateGatewayPaymentInput,
  GetGatewayPaymentInput,
  GetGatewayPaymentInstructionsInput,
} from '../../../application/dto/gateway-payment-input.dto';
import { GatewayPaymentInstructions } from '../../../application/dto/gateway-payment-instructions.dto';
import { CancelGatewayPaymentInput } from '../../../application/dto/gateway-cancel-input.dto';
import { RefundGatewayPaymentInput } from '../../../application/dto/gateway-refund-input.dto';
import { GatewayPaymentResult } from '../../../application/dto/gateway-payment-result.dto';
import { GatewayNotImplementedError } from '../../../domain/errors/gateway-errors';

import { MercadoPagoApiClient, MercadoPagoApiError } from './mercado-pago-api.client';
import { MercadoPagoCredentialsMapper } from './mercado-pago-credentials.mapper';
import { MercadoPagoCreatePaymentRequest } from './mercado-pago.types';

@Injectable()
export class MercadoPagoPaymentGatewayAdapter implements IPaymentGateway {
  readonly provider = PaymentProvider.MERCADO_PAGO;

  constructor(private readonly apiClient: MercadoPagoApiClient) {}

  getCapabilities(): GatewayCapabilities {
    return {
      supportsPix: true,
      supportsBoleto: true,
      supportsCard: true,
      supportsBankTransfer: true,
      supportsRefund: true,
      supportsCancel: true,
      supportsPartialRefund: true,
      supportsSandbox: true,
      supportsWebhooks: true,
      supportsCheckoutRedirect: true,
      supportsEmbeddedCheckout: true,
    };
  }

  async createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult> {
    if (input.method !== PaymentMethod.PIX && input.method !== PaymentMethod.BOLETO) {
      throw new GatewayNotImplementedError(this.provider);
    }

    if (!input.credentials || !input.credentials.accessToken) {
      throw new Error('Mercado Pago accessToken is missing from credentials.');
    }

    const { accessToken } = input.credentials;

    let paymentMethodId = 'pix';
    if (input.method === PaymentMethod.BOLETO) {
      paymentMethodId = 'bolbradesco'; // Mercado Pago boleto method ID
    }

    const payload: MercadoPagoCreatePaymentRequest = {
      transaction_amount: input.amount / 100, // Mercado Pago expects float amount
      description: input.description || `Payment ${input.paymentReference}`,
      payment_method_id: paymentMethodId,
      payer: {
        email: input.customer.email || 'payer@example.com',
        first_name: input.customer.name.split(' ')[0],
        last_name: input.customer.name.split(' ').slice(1).join(' '),
      },
      external_reference: input.paymentReference,
    };

    if (input.customer.document) {
      const docStr = input.customer.document.replace(/\D/g, '');
      payload.payer.identification = {
        type: docStr.length === 14 ? 'CNPJ' : 'CPF',
        number: docStr,
      };
    }

    const response = await this.apiClient.createPayment(accessToken, payload, input.idempotencyKey);

    return this.mapToGatewayPaymentResult(response);
  }

  async getPayment(input: GetGatewayPaymentInput): Promise<GatewayPaymentResult> {
    if (!input.providerPaymentId) {
      throw new Error('providerPaymentId is required to fetch payment');
    }
    if (!input.credentials || !input.credentials.accessToken) {
      throw new Error('Mercado Pago accessToken is missing from credentials.');
    }

    const { accessToken } = input.credentials;
    const response = await this.apiClient.getPayment(accessToken, input.providerPaymentId);

    return this.mapToGatewayPaymentResult(response);
  }

  async cancelPayment(input: CancelGatewayPaymentInput): Promise<GatewayPaymentResult> {
    throw new GatewayNotImplementedError(this.provider);
  }

  async refundPayment(input: RefundGatewayPaymentInput): Promise<GatewayPaymentResult> {
    throw new GatewayNotImplementedError(this.provider);
  }

  async getPaymentInstructions(input: GetGatewayPaymentInstructionsInput): Promise<GatewayPaymentInstructions> {
    if (!input.providerPaymentId) {
      throw new Error('providerPaymentId is required to fetch instructions');
    }
    if (!input.credentials || !input.credentials.accessToken) {
      throw new Error('Mercado Pago accessToken is missing from credentials.');
    }

    const { accessToken } = input.credentials;
    const response = await this.apiClient.getPayment(accessToken, input.providerPaymentId);

    const result = this.mapToGatewayPaymentResult(response);

    const instructions = new GatewayPaymentInstructions();
    instructions.provider = this.provider;
    instructions.paymentId = input.paymentId;
    instructions.providerPaymentId = input.providerPaymentId;
    instructions.method = input.method;
    instructions.status = result.normalizedStatus;
    instructions.providerStatus = result.providerStatus;
    instructions.dueDate = result.dueDate ? new Date(result.dueDate) : null;
    instructions.invoiceUrl = result.invoiceUrl || null;
    instructions.bankSlipUrl = result.bankSlipUrl || null;
    instructions.paymentUrl = result.checkoutUrl || null;
    instructions.isExpired = instructions.status === PaymentStatus.FAILED || instructions.status === PaymentStatus.CANCELED || instructions.status === PaymentStatus.REFUNDED;
    instructions.canCancel = instructions.status === PaymentStatus.PENDING || instructions.status === PaymentStatus.PROCESSING;
    instructions.canRefresh = !instructions.isExpired;

    if (input.method === PaymentMethod.PIX) {
      instructions.pixCopyPaste = result.pixCopyPaste || null;
      instructions.pixQrCodeBase64 = result.pixQrCode || null;
      instructions.expiresAt = result.expiresAt ? new Date(result.expiresAt) : null;
    }

    return instructions;
  }

  private mapToGatewayPaymentResult(response: any): GatewayPaymentResult {
    const result = new GatewayPaymentResult();
    result.provider = this.provider;
    result.providerPaymentId = String(response.id);
    result.providerStatus = response.status;
    result.normalizedStatus = this.mapStatus(response.status);

    if (response.point_of_interaction?.transaction_data) {
      const data = response.point_of_interaction.transaction_data;
      if (data.qr_code) result.pixCopyPaste = data.qr_code;
      if (data.qr_code_base64) result.pixQrCode = data.qr_code_base64;
      if (data.ticket_url) result.bankSlipUrl = data.ticket_url;
    }

    return result;
  }

  private mapStatus(status: string): PaymentStatus {
    switch (status) {
      case 'approved': return PaymentStatus.APPROVED;
      case 'pending':
      case 'in_process': return PaymentStatus.PENDING;
      case 'rejected':
      case 'cancelled': return PaymentStatus.FAILED; // Or CANCELED, depending on logic
      case 'refunded': return PaymentStatus.REFUNDED;
      default: return PaymentStatus.PENDING;
    }
  }
}
