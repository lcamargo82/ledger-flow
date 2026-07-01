import { MercadoPagoCredentials } from './mercado-pago.types';

export class MercadoPagoCredentialsMapper {
  static toJSONString(credentials: MercadoPagoCredentials): string {
    return JSON.stringify(credentials);
  }

  static fromJSONString(jsonStr: string): MercadoPagoCredentials {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<MercadoPagoCredentials>;
      if (!parsed.accessToken || !parsed.refreshToken || !parsed.tokenExpiresAt) {
        throw new Error('Invalid Mercado Pago credentials format.');
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        tokenExpiresAt: parsed.tokenExpiresAt,
        merchantId: parsed.merchantId,
        scope: parsed.scope,
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Failed to parse Mercado Pago credentials: ${err.message}`);
    }
  }

  static deriveFingerprint(credentials: MercadoPagoCredentials): string {
    if (!credentials.merchantId) {
      throw new Error('Merchant ID is required to derive Mercado Pago fingerprint.');
    }
    return `mp_${credentials.merchantId}`;
  }
}
