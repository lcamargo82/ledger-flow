/* eslint-disable */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  GatewayCredentials,
  EncryptedGatewayCredentials,
} from '../../domain/interfaces/gateway-credentials.interface';
import { GatewayCredentialsEncryptionService } from '../../application/services/gateway-credentials-encryption.service';
import { GatewayCredentialsInvalidError } from '../../domain/errors/gateway-errors';

@Injectable()
export class Aes256GcmCredentialsEncryptionService implements GatewayCredentialsEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private key: Buffer;

  constructor() {
    const keyString = process.env.GATEWAY_CREDENTIALS_ENCRYPTION_KEY;
    if (!keyString) {
      console.warn(
        'GATEWAY_CREDENTIALS_ENCRYPTION_KEY is not defined. Using a placeholder for boot only. Do not use in production without real key.',
      );
      // Do not block boot, but runtime will fail if not proper
      this.key = Buffer.alloc(this.keyLength);
    } else {
      const decodedKey = Buffer.from(keyString, 'base64');
      if (decodedKey.length !== this.keyLength) {
        throw new InternalServerErrorException(
          'GATEWAY_CREDENTIALS_ENCRYPTION_KEY must be exactly 32 bytes (256 bits) when decoded from base64.',
        );
      }
      this.key = decodedKey;
    }
  }

  encrypt(credentials: GatewayCredentials): EncryptedGatewayCredentials {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      const plaintext = JSON.stringify(credentials);
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag().toString('base64');
      const ivString = iv.toString('base64');

      return {
        version: 1,
        algorithm: this.algorithm,
        iv: ivString,
        authTag: authTag,
        ciphertext: encrypted,
      };
    } catch (error) {
      // Never log the secret
      throw new InternalServerErrorException('Failed to encrypt credentials.');
    }
  }

  decrypt(encryptedValue: string): GatewayCredentials {
    try {
      if (!encryptedValue) {
        throw new GatewayCredentialsInvalidError('Missing encrypted data.');
      }

      let ivString: string;
      let authTagString: string;
      let encryptedString: string;

      try {
        // Try to parse the new JSON format
        const parsed = JSON.parse(encryptedValue) as EncryptedGatewayCredentials;
        if (parsed.version === 1 && parsed.algorithm === this.algorithm) {
          ivString = parsed.iv as string;
          authTagString = parsed.authTag as string;
          encryptedString = parsed.ciphertext as string;

          if (!ivString || !authTagString || !encryptedString) {
            throw new GatewayCredentialsInvalidError('Invalid encrypted data format.');
          }
        } else if (parsed.encryptedData) {
          // Fallback if somehow it was wrapped
          const parts = parsed.encryptedData.split(':');
          if (parts.length !== 3) throw new Error('Invalid format');
          [ivString, authTagString, encryptedString] = parts;
        } else {
          throw new Error('Invalid JSON structure');
        }
      } catch {
        // Fallback to old format iv:authTag:encrypted
        const parts = encryptedValue.split(':');
        if (parts.length !== 3) {
          throw new GatewayCredentialsInvalidError('Invalid encrypted data format.');
        }
        [ivString, authTagString, encryptedString] = parts;
      }

      const iv = Buffer.from(ivString, 'base64');
      const authTag = Buffer.from(authTagString, 'base64');
      const encrypted = Buffer.from(encryptedString, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as GatewayCredentials;
    } catch (error) {
      // Never log the secret
      throw new GatewayCredentialsInvalidError('Failed to decrypt or parse credentials.');
    }
  }

  createFingerprint(credentials: GatewayCredentials): string {
    // We sort the keys to ensure consistent JSON representation
    const sortedKeys = Object.keys(credentials).sort();
    const normalized: Record<string, any> = {};
    for (const key of sortedKeys) {
      normalized[key] = credentials[key];
    }

    const payloadString = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(payloadString).digest('hex');
  }
}
