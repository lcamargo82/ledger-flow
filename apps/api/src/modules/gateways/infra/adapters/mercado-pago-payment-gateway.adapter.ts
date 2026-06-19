/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
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

@Injectable()
export class MercadoPagoPaymentGatewayAdapter implements IPaymentGateway {
  readonly provider = PaymentProvider.MERCADO_PAGO;

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
    throw new GatewayNotImplementedError(this.provider);
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
}
