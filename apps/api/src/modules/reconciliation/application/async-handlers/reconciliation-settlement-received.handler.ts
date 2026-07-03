import { Injectable, Logger } from '@nestjs/common';
import { AsyncEventHandler } from '../../../async/domain/interfaces/async-event-handler.interface';
import { AsyncMessageEnvelope } from '../../../async/domain/entities/async-message-envelope';
import { ReconciliationMatchingService } from '../services/reconciliation-matching.service';

@Injectable()
export class ReconciliationSettlementReceivedAsyncHandler implements AsyncEventHandler {
  readonly eventType = 'reconciliation.settlement_received';
  readonly consumerName = 'ReconciliationSettlementReceivedAsyncHandler';
  private readonly logger = new Logger(ReconciliationSettlementReceivedAsyncHandler.name);

  constructor(private readonly matchingService: ReconciliationMatchingService) {}

  handle(input: AsyncMessageEnvelope): Promise<void> {
    this.logger.log(`Settlement received for reconciliation foundation: ${input.aggregateId}`);
    return this.matchingService.matchSettlement(input.aggregateId).then(() => undefined);
  }
}
