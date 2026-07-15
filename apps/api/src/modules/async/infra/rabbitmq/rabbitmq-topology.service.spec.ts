import * as amqp from 'amqplib';
import { RabbitMqTopologyService } from './rabbitmq-topology.service';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitMqTopologyService', () => {
  const assertExchange = jest.fn();
  const assertQueue = jest.fn();
  const bindQueue = jest.fn();
  const unbindQueue = jest.fn();
  const closeChannel = jest.fn();
  const closeConnection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (amqp.connect as jest.Mock).mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertExchange,
        assertQueue,
        bindQueue,
        unbindQueue,
        close: closeChannel,
      }),
      close: closeConnection,
    });
  });

  it('routes only domain events that have internal consumers', async () => {
    await new RabbitMqTopologyService().initializeTopology();

    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.sales-intelligence.events.q',
      'ledgerflow.events',
      'financial.order_fact.created',
    );
    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.sales-intelligence.events.q',
      'ledgerflow.events',
      'inventory.reservation.consumed',
    );
    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.sales-intelligence.events.q',
      'ledgerflow.events',
      'channel.order.shipping_summary.updated',
    );
    expect(unbindQueue).toHaveBeenCalledWith(
      'ledgerflow.channel.events.q',
      'ledgerflow.events',
      'channel.#',
    );
  });

  it('binds channel webhook events to the consumed handler queue', async () => {
    await new RabbitMqTopologyService().initializeTopology();

    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.channel.webhook.events.q',
      'ledgerflow.events',
      'channel.webhook.received',
    );
  });
});
