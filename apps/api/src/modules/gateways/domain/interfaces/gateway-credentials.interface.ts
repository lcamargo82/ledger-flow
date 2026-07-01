export interface GatewayCredentials {
  apiKey?: string;
  secretKey?: string;
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
  accessToken?: string;
  // Other dynamic fields can be supported
  [key: string]: any;
}

export interface EncryptedGatewayCredentials {
  version?: number;
  algorithm?: string;
  iv?: string;
  authTag?: string;
  ciphertext?: string;
  encryptedData?: string; // Legacy format
}
