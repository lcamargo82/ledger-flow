import { httpClient as api } from './http-client';

export interface GatewayConnection {
  id: string;
  provider: string;
  environment: string;
  status: string;
  priority: number;
  displayName?: string;
  supportedMethods: string[];
  healthStatus: string;
  credentialsConfigured: boolean;
  createdAt: string;
  updatedAt: string;
  lastFailureAt?: string | null;
  lastSuccessfulOperationAt?: string | null;
}

export interface CreateAsaasConnectionPayload {
  environment: string;
  apiKey: string;
  displayName?: string;
  priority?: number;
  supportedMethods?: string[];
}

export interface UpdateGatewayConnectionPayload {
  displayName?: string;
  priority?: number;
  supportedMethods?: string[];
  status?: string;
}

export interface UpdateCredentialsPayload {
  apiKey: string;
}

export interface UpdateStatusPayload {
  status: string;
}

export class GatewayConnectionsService {
  static async listConnections(): Promise<GatewayConnection[]> {
    const { data } = await api.get<{ data: GatewayConnection[] }>('/gateways/connections');
    return data.data;
  }

  static async createAsaasConnection(payload: CreateAsaasConnectionPayload): Promise<GatewayConnection> {
    const { data } = await api.post<GatewayConnection>('/gateways/connections/asaas', payload);
    return data;
  }

  static async updateConnection(id: string, payload: UpdateGatewayConnectionPayload): Promise<GatewayConnection> {
    const { data } = await api.patch<GatewayConnection>(`/gateways/connections/${id}`, payload);
    return data;
  }

  static async updateCredentials(id: string, payload: UpdateCredentialsPayload): Promise<GatewayConnection> {
    const { data } = await api.post<GatewayConnection>(`/gateways/connections/${id}/credentials`, payload);
    return data;
  }

  static async updateStatus(id: string, payload: UpdateStatusPayload): Promise<GatewayConnection> {
    const { data } = await api.patch<GatewayConnection>(`/gateways/connections/${id}/status`, payload);
    return data;
  }

  static async disconnectConnection(id: string): Promise<GatewayConnection> {
    const { data } = await api.post<GatewayConnection>(`/gateways/connections/${id}/disconnect`);
    return data;
  }
}
