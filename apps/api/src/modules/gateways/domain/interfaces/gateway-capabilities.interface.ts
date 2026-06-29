export interface GatewayCapabilities {
  supportsPix: boolean;
  supportsBoleto: boolean;
  supportsCard: boolean;
  supportsBankTransfer: boolean;
  supportsRefund: boolean;
  supportsCancel: boolean;
  supportsPartialRefund: boolean;
  supportsSandbox: boolean;
  supportsWebhooks: boolean;
  supportsCheckoutRedirect: boolean;
  supportsEmbeddedCheckout: boolean;
}
