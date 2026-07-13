import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { GatewayCredentialsEncryptionService } from '../../../gateways/application/services/gateway-credentials-encryption.service';

@Injectable()
export class NotificationWebhookSecretService {
  constructor(private readonly encryption: GatewayCredentialsEncryptionService) {}

  generate() {
    const plaintext = randomBytes(32).toString('base64url');
    const credentials = { webhookSecret: plaintext };
    return {
      plaintext,
      encryptedSecretJson: this.encryption.encrypt(credentials) as Prisma.InputJsonValue,
      fingerprint: this.encryption.createFingerprint(credentials),
    };
  }

  decrypt(encryptedSecretJson: Prisma.JsonValue): string {
    const credentials = this.encryption.decrypt(JSON.stringify(encryptedSecretJson));
    if (!credentials.webhookSecret) {
      throw new InternalServerErrorException('Webhook secret is unavailable.');
    }
    return credentials.webhookSecret;
  }
}
