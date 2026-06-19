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
  encryptedData: string;
}
