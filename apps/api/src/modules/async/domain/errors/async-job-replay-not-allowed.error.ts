export class AsyncJobReplayNotAllowedError extends Error {
  constructor(reason: string) {
    super(`Replay not allowed: ${reason}`);
    this.name = 'AsyncJobReplayNotAllowedError';
  }
}
