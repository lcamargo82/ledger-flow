export abstract class AsyncMessagePublisher {
  abstract publish(routingKey: string, payload: any): Promise<boolean>;
}
