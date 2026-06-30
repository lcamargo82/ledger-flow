export const ASYNC_RETRY_POLICY = {
  DELAYS_MS: [
    30000, // 30s
    120000, // 2m
    600000, // 10m
    1800000, // 30m
  ],
  MAX_ATTEMPTS: 5,
};
