import { Aes256GcmCredentialsEncryptionService } from './aes-256-gcm-credentials-encryption.service';
import { GatewayCredentials } from '../../domain/interfaces/gateway-credentials.interface';

describe('Aes256GcmCredentialsEncryptionService', () => {
  let service: Aes256GcmCredentialsEncryptionService;

  beforeEach(() => {
    process.env.GATEWAY_CREDENTIALS_ENCRYPTION_KEY = Buffer.from(
      '12345678901234567890123456789012',
    ).toString('base64');
    service = new Aes256GcmCredentialsEncryptionService();
  });

  afterEach(() => {
    delete process.env.GATEWAY_CREDENTIALS_ENCRYPTION_KEY;
  });

  it('should encrypt and decrypt credentials successfully', () => {
    const creds: GatewayCredentials = {
      apiKey: 'secret123',
      clientId: 'client456',
    };
    const encrypted = service.encrypt(creds);

    expect(encrypted.encryptedData).toBeDefined();
    expect(encrypted.encryptedData).toContain(':');
    expect(encrypted.encryptedData).not.toContain('secret123'); // No plaintext leak

    const decrypted = service.decrypt(encrypted.encryptedData);
    expect(decrypted).toEqual(creds);
  });

  it('should create consistent fingerprint for credentials regardless of key order', () => {
    const creds1: GatewayCredentials = { a: '1', b: '2' };
    const creds2: GatewayCredentials = { b: '2', a: '1' };

    const hash1 = service.createFingerprint(creds1);
    const hash2 = service.createFingerprint(creds2);

    expect(hash1).toEqual(hash2);
  });
});
