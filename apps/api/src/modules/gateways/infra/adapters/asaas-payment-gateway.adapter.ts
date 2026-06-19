/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentMethod, GatewayEnvironment } from '@prisma/client';
import { IPaymentGateway } from '../../domain/interfaces/payment-gateway.interface';
import { GatewayCapabilities } from '../../domain/interfaces/gateway-capabilities.interface';
import {
  CreateGatewayPaymentInput,
  GetGatewayPaymentInput,
} from '../../application/dto/gateway-payment-input.dto';
import { CancelGatewayPaymentInput } from '../../application/dto/gateway-cancel-input.dto';
import { RefundGatewayPaymentInput } from '../../application/dto/gateway-refund-input.dto';
import { GatewayPaymentResult } from '../../application/dto/gateway-payment-result.dto';
import { GatewayNotImplementedError } from '../../domain/errors/gateway-errors';
import { AsaasApiClient } from '../clients/asaas-api.client';
import { AsaasPaymentCreateError } from '../../domain/errors/asaas-errors';
import { AsaasStatusMapper } from '../../application/mappers/asaas-status.mapper';

@Injectable()
export class AsaasPaymentGatewayAdapter implements IPaymentGateway {
  readonly provider = PaymentProvider.ASAAS;

  constructor(private readonly asaasApiClient: AsaasApiClient) {}

  getCapabilities(): GatewayCapabilities {
    return {
      supportsPix: true,
      supportsBoleto: true,
      supportsCard: false,
      supportsBankTransfer: false,
      supportsRefund: false,
      supportsCancel: true,
      supportsPartialRefund: false,
      supportsSandbox: true,
      supportsWebhooks: true,
      supportsCheckoutRedirect: true,
      supportsEmbeddedCheckout: false,
    };
  }

  async createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult> {
    if (input.method !== PaymentMethod.PIX && input.method !== PaymentMethod.BOLETO) {
      throw new GatewayNotImplementedError(this.provider);
    }

    if (input.environment !== GatewayEnvironment.SANDBOX) {
      throw new Error(`[AsaasAdapter] Environment ${input.environment} not supported in this phase.`);
    }

    if (!input.providerCustomerId) {
      throw new Error('[AsaasAdapter] providerCustomerId is required');
    }

    if (!input.credentials || !input.credentials['apiKey']) {
      throw new Error('[AsaasAdapter] API key missing in credentials');
    }

    // Convert amount in cents to decimal
    const valueDecimal = this.centsToAsaasDecimal(input.amount);
    
    // Default due date to today if not provided
    const dueDate = input.dueDate ? new Date(input.dueDate) : new Date();
    const formattedDueDate = dueDate.toISOString().split('T')[0];

    // Check idempotency externally: try to find payment by externalReference first
    const existingPayments = await this.asaasApiClient.get('/payments', {
      externalReference: input.paymentReference,
    }, { access_token: input.credentials['apiKey'] });

    if (existingPayments && existingPayments.data && existingPayments.data.length > 0) {
      // Payment already exists in Asaas for this reference
      const existing = existingPayments.data[0];
      return {
        provider: this.provider,
        providerPaymentId: existing.id,
        providerStatus: existing.status,
        normalizedStatus: AsaasStatusMapper.toLedgerFlowStatus(existing.status),
        invoiceUrl: existing.invoiceUrl,
        bankSlipUrl: existing.bankSlipUrl,
        dueDate: existing.dueDate ? new Date(existing.dueDate) : undefined,
      };
    }

    // Create new payment
    const payload = {
      customer: input.providerCustomerId,
      billingType: input.method === PaymentMethod.PIX ? 'PIX' : 'BOLETO',
      value: Number(valueDecimal),
      dueDate: formattedDueDate,
      description: input.description || `Pagamento ${input.paymentReference}`,
      externalReference: input.paymentReference,
    };

    const response = await this.asaasApiClient.post('/payments', payload, {
      access_token: input.credentials['apiKey'],
    });

    if (!response || !response.id) {
      throw new AsaasPaymentCreateError('Falha ao criar cobrança no provedor.');
    }

    return {
      provider: this.provider,
      providerPaymentId: response.id,
      providerStatus: response.status,
      normalizedStatus: AsaasStatusMapper.toLedgerFlowStatus(response.status),
      invoiceUrl: response.invoiceUrl,
      bankSlipUrl: response.bankSlipUrl,
      dueDate: response.dueDate ? new Date(response.dueDate) : undefined,
    };
  }

   
  async cancelPayment(input: CancelGatewayPaymentInput): Promise<GatewayPaymentResult> {
    throw new GatewayNotImplementedError(this.provider);
  }

   
  async refundPayment(input: RefundGatewayPaymentInput): Promise<GatewayPaymentResult> {
    throw new GatewayNotImplementedError(this.provider);
  }

   
  async getPayment(input: GetGatewayPaymentInput): Promise<GatewayPaymentResult> {
    throw new GatewayNotImplementedError(this.provider);
  }

  private centsToAsaasDecimal(amountInCents: number): string {
    return (amountInCents / 100).toFixed(2);
  }
}
