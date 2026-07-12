import { Injectable } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { NotificationWebhookHostResolver } from '../../domain/interfaces/notification-webhook-host-resolver';

@Injectable()
export class NodeNotificationWebhookHostResolver implements NotificationWebhookHostResolver {
  async resolve(hostname: string): Promise<string[]> {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.map(({ address }) => address);
  }
}
