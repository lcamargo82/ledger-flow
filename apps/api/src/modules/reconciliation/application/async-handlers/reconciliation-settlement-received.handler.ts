import { Injectable, Logger } from '@nestjs/common';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';

@Injectable()
export class ReconciliationSettlementReceivedAsyncHandler implements AsyncEventHandler {
  readonly eventType = 'reconciliation.settlement_received';
  readonly consumerName = 'ReconciliationSettlementReceivedAsyncHandler';
  private readonly logger = new Logger(ReconciliationSettlementReceivedAsyncHandler.name);

  handle(input: AsyncMessageEnvelope): Promise<void> {
    this.logger.log(`Settlement received for reconciliation foundation: ${input.aggregateId}`);
    return Promise.resolve();
  }
}
