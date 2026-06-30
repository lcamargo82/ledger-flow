export interface AsyncMessagePublisher {
  publish(routingKey: string, payload: any): Promise<boolean>;
}
