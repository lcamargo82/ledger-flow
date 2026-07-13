import { MercadoPagoFinancialReadService } from './mercado-pago-financial-read.service';

describe('MercadoPagoFinancialReadService', () => {
  it('normalizes Mercado Pago payments into sanitized settlement events', async () => {
    const apiClient = {
      searchPayments: jest.fn().mockResolvedValue({
        paging: { total: 1, limit: 50, offset: 0 },
        results: [
          {
            id: 123,
            status: 'approved',
            status_detail: 'accredited',
            transaction_amount: 100,
            external_reference: 'order-1',
            payment_method_id: 'pix',
            date_created: '2026-07-12T10:00:00.000Z',
            date_approved: '2026-07-12T10:01:00.000Z',
            date_last_updated: '2026-07-12T10:02:00.000Z',
            money_release_date: '2026-07-13T10:00:00.000Z',
            currency_id: 'BRL',
            fee_details: [{ type: 'mercadopago_fee', amount: 4.99, fee_payer: 'collector' }],
            transaction_details: { net_received_amount: 95.01 },
            point_of_interaction: {
              transaction_data: {
                qr_code: 'SECRET_QR_PAYLOAD',
                qr_code_base64: 'SECRET_BASE64',
              },
            },
          },
        ],
      }),
    };
    const service = new MercadoPagoFinancialReadService(apiClient as never);

    const page = await service.fetchPaymentEvents({
      accessToken: 'token',
      gatewayConfigurationId: 'gateway-1',
      operationalFinancialAccountId: 'account-1',
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T23:59:59.999Z'),
    });

    expect(apiClient.searchPayments).toHaveBeenCalledWith('token', {
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T23:59:59.999Z'),
      offset: 0,
      limit: 50,
      sort: 'date_created',
      criteria: 'asc',
    });
    expect(page.data).toHaveLength(1);
    expect(page.data[0]).toMatchObject({
      provider: 'MERCADO_PAGO',
      operationalFinancialAccountId: 'account-1',
      providerEventId: 'mp-payment:gateway-1:123',
      providerPaymentId: '123',
      externalReference: 'order-1',
      eventType: 'payment',
      providerStatus: 'approved',
      amountMinor: '10000',
      feeAmountMinor: '499',
      netAmountMinor: '9501',
      currency: 'BRL',
    });
    expect(JSON.stringify(page.data[0].normalizedPayload)).not.toContain('SECRET_QR_PAYLOAD');
    expect(JSON.stringify(page.data[0].normalizedPayload)).not.toContain('SECRET_BASE64');
  });
});
