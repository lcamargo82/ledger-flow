export class RetryableAsyncJobError extends Error {
  constructor(message: string, public readonly code: string = 'RETRYABLE_ERROR') {
    super(message);
    this.name = 'RetryableAsyncJobError';
  }
}
