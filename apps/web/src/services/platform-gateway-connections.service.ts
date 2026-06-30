import { api } from './api';

export interface PlatformGatewayConnection {
  id: string;
  tenantId: string;
  provider: string;
  environment: string;
  status: string;
  healthStatus: string;
  createdAt: string;
  updatedAt: string;
  lastFailureAt?: string | null;
  lastSuccessfulOperationAt?: string | null;
}

export interface UpdatePlatformGatewayConnectionStatusPayload {
  status: string;
  reason: string;
}

export class PlatformGatewayConnectionsService {
  static async listConnections(): Promise<PlatformGatewayConnection[]> {
    const { data } = await api.get<{ data: PlatformGatewayConnection[] }>('/platform/gateway-connections');
    return data.data;
  }

  static async updateStatus(id: string, payload: UpdatePlatformGatewayConnectionStatusPayload): Promise<PlatformGatewayConnection> {
    const { data } = await api.patch<PlatformGatewayConnection>(`/platform/gateway-connections/${id}/status`, payload);
    return data;
  }
}
