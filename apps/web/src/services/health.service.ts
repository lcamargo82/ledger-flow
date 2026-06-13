import { httpClient } from './http-client';

export const healthService = {
  getRoot() {
    return httpClient.get('/');
  },

  getHealth() {
    return httpClient.get('/health');
  },

  getLiveness() {
    return httpClient.get('/health/liveness');
  },

  getReadiness() {
    return httpClient.get('/health/readiness');
  }
};
