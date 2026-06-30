import { Injectable, Logger } from '@nestjs/common';
import { AsyncEventHandler } from '../../domain/interfaces/async-event-handler.interface';

@Injectable()
export class AsyncHandlerRegistryService {
  private readonly handlers = new Map<string, AsyncEventHandler[]>();
  private readonly logger = new Logger(AsyncHandlerRegistryService.name);

  register(handler: AsyncEventHandler) {
    const eventType = handler.eventType;
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    this.logger.log(
      `Registered async handler ${handler.consumerName} for event ${eventType}`,
    );
  }

  getHandlers(eventType: string): AsyncEventHandler[] {
    return this.handlers.get(eventType) || [];
  }
}
