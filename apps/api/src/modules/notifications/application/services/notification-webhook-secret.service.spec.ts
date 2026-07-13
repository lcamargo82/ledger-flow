import { NotificationWebhookSecretService } from './notification-webhook-secret.service';

describe('NotificationWebhookSecretService', () => {
  const encryption = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    createFingerprint: jest.fn(),
  };
  let service: NotificationWebhookSecretService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationWebhookSecretService(encryption);
  });

  it('generates and encrypts a secret without persisting plaintext', () => {
    encryption.encrypt.mockReturnValue({ ciphertext: 'encrypted' });
    encryption.createFingerprint.mockReturnValue('fingerprint');

    const result = service.generate();

    expect(result.plaintext).toHaveLength(43);
    expect(result.encryptedSecretJson).toEqual({ ciphertext: 'encrypted' });
    expect(result.fingerprint).toBe('fingerprint');
    expect(encryption.encrypt).toHaveBeenCalledWith({ webhookSecret: result.plaintext });
  });

  it('decrypts only the webhook secret field', () => {
    encryption.decrypt.mockReturnValue({ webhookSecret: 'secret-123' });

    expect(service.decrypt({ ciphertext: 'encrypted' })).toBe('secret-123');
  });
});
