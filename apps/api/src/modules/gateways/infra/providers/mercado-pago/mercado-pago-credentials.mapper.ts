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
    } catch (error) {
      throw new Error(`Failed to parse Mercado Pago credentials: ${(error as Error).message}`);
    }
  }

  static deriveFingerprint(credentials: MercadoPagoCredentials): string {
    // Generate a secure fingerprint based on the merchant id or part of token if not available.
    // Usually the user_id from Mercado Pago is stored in merchantId.
    if (credentials.merchantId) {
      return `mp_${credentials.merchantId}`;
    }
    // Fallback: hash the access token so we can compare but not read it
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(credentials.accessToken)
      .digest('hex')
      .substring(0, 16);
  }
}
