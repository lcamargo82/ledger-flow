import {
  GatewayCredentials,
  EncryptedGatewayCredentials,
} from '../../domain/interfaces/gateway-credentials.interface';

export abstract class GatewayCredentialsEncryptionService {
  abstract encrypt(credentials: GatewayCredentials): EncryptedGatewayCredentials;
  abstract decrypt(encryptedValue: string): GatewayCredentials;
  abstract createFingerprint(credentials: GatewayCredentials): string;
}
