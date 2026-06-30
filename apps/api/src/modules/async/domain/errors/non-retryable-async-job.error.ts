export class NonRetryableAsyncJobError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'NON_RETRYABLE_ERROR',
  ) {
    super(message);
    this.name = 'NonRetryableAsyncJobError';
  }
}
