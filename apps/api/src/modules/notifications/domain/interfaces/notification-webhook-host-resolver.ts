export abstract class NotificationWebhookHostResolver {
  abstract resolve(hostname: string): Promise<string[]>;
}
