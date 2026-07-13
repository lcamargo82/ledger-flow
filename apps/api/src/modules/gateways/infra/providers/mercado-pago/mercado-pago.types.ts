export interface MercadoPagoOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

export interface MercadoPagoCreatePaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: 'CPF' | 'CNPJ';
      number: string;
    };
  };
  external_reference?: string;
}

export interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  external_reference?: string;
  payment_method_id?: string;
  date_approved?: string;
  date_created?: string;
  date_last_updated?: string;
  money_release_date?: string;
  currency_id?: string;
  fee_details?: Array<{
    type?: string;
    amount?: number;
    fee_payer?: string;
  }>;
  transaction_details?: {
    net_received_amount?: number;
    total_paid_amount?: number;
    overpaid_amount?: number;
  };
  refunds?: MercadoPagoRefundResponse[];
  charges_details?: Array<{
    id?: string;
    name?: string;
    type?: string;
    accounts?: Record<string, unknown>;
    amounts?: Record<string, unknown>;
  }>;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

export interface MercadoPagoRefundResponse {
  id?: number | string;
  payment_id?: number | string;
  status: string;
  amount?: number;
  source?: {
    id?: string;
    name?: string;
    type?: string;
  };
  date_created?: string;
  unique_sequence_number?: string;
}

export interface MercadoPagoPaymentSearchResponse {
  paging?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
  results: MercadoPagoPaymentResponse[];
}

export interface MercadoPagoCredentials {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  merchantId?: string;
  scope?: string;
}
