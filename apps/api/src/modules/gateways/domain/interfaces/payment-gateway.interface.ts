import { PaymentProvider } from '@prisma/client';
import { GatewayCapabilities } from './gateway-capabilities.interface';
import {
  CreateGatewayPaymentInput,
  GetGatewayPaymentInput,
  GetGatewayPaymentInstructionsInput,
} from '../../application/dto/gateway-payment-input.dto';
import { GatewayPaymentInstructions } from '../../application/dto/gateway-payment-instructions.dto';
import { CancelGatewayPaymentInput } from '../../application/dto/gateway-cancel-input.dto';
import { RefundGatewayPaymentInput } from '../../application/dto/gateway-refund-input.dto';
import { GatewayPaymentResult } from '../../application/dto/gateway-payment-result.dto';

export interface IPaymentGateway {
  readonly provider: PaymentProvider;

  getCapabilities(): GatewayCapabilities;

  createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult>;

  cancelPayment(input: CancelGatewayPaymentInput): Promise<GatewayPaymentResult>;

  refundPayment(input: RefundGatewayPaymentInput): Promise<GatewayPaymentResult>;

  getPayment(input: GetGatewayPaymentInput): Promise<GatewayPaymentResult>;

  getPaymentInstructions(
    input: GetGatewayPaymentInstructionsInput,
  ): Promise<GatewayPaymentInstructions>;
}
