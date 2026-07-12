import { BadRequestException, Injectable } from '@nestjs/common';
import { isIP } from 'net';
import { NotificationWebhookHostResolver } from '../../domain/interfaces/notification-webhook-host-resolver';

@Injectable()
export class NotificationWebhookEndpointPolicyService {
  constructor(private readonly resolver: NotificationWebhookHostResolver) {}

  async assertSafe(endpointUrl: string): Promise<string> {
    let url: URL;
    try {
      url = new URL(endpointUrl);
    } catch {
      throw new BadRequestException('Webhook endpoint URL is invalid.');
    }

    if (url.protocol !== 'https:') {
      throw new BadRequestException('Webhook endpoint must use HTTPS.');
    }
    if (url.username || url.password) {
      throw new BadRequestException('Webhook endpoint cannot contain credentials.');
    }
    if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
      throw new BadRequestException('Webhook endpoint cannot use localhost.');
    }

    const addresses = isIP(url.hostname)
      ? [url.hostname]
      : await this.resolver.resolve(url.hostname);
    if (!addresses.length || addresses.some((address) => this.isPrivateAddress(address))) {
      throw new BadRequestException('Webhook endpoint resolves to a private network.');
    }

    return url.toString();
  }

  private isPrivateAddress(address: string) {
    if (address.includes(':')) {
      const normalized = address.toLowerCase();
      return (
        normalized === '::1' ||
        normalized === '::' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb') ||
        normalized.startsWith('::ffff:127.') ||
        normalized.startsWith('::ffff:10.') ||
        normalized.startsWith('::ffff:192.168.')
      );
    }

    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
}
