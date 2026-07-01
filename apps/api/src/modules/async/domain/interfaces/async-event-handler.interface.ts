import { AsyncMessageEnvelope } from '../entities/async-message-envelope';

export interface AsyncEventHandler {
  readonly eventType: string;
  readonly consumerName: string;

  handle(input: AsyncMessageEnvelope): Promise<void>;
}
