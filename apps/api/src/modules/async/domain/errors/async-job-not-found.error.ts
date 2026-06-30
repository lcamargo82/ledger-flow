export class AsyncJobNotFoundError extends Error {
  constructor(id: string) {
    super(`Async job with ID ${id} not found`);
    this.name = 'AsyncJobNotFoundError';
  }
}
