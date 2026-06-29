export interface IGatewayApiClient {
  post(endpoint: string, payload: any, headers?: Record<string, string>): Promise<any>;

  get(
    endpoint: string,
    params?: Record<string, string>,
    headers?: Record<string, string>,
  ): Promise<any>;
}
