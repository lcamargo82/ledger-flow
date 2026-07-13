import * as amqp from 'amqplib';
import { RabbitMqTopologyService } from './rabbitmq-topology.service';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('RabbitMqTopologyService', () => {
  const assertExchange = jest.fn();
  const assertQueue = jest.fn();
  const bindQueue = jest.fn();
  const closeChannel = jest.fn();
  const closeConnection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (amqp.connect as jest.Mock).mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertExchange,
        assertQueue,
        bindQueue,
        close: closeChannel,
      }),
      close: closeConnection,
    });
  });

  it('binds emitted domain events so mandatory outbox publishes are routable', async () => {
    await new RabbitMqTopologyService().initializeTopology();

    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.export.events.q',
      'ledgerflow.events',
      'export.job.*',
    );
    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.inventory.events.q',
      'ledgerflow.events',
      'inventory.#',
    );
    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.orders.events.q',
      'ledgerflow.events',
      'orders.order.*',
    );
    expect(bindQueue).toHaveBeenCalledWith(
      'ledgerflow.financial.events.q',
      'ledgerflow.events',
      'financial.#',
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
