import {
  ChannelIntegration,
  ChannelIntegrationStatus,
  ChannelProvider,
  ChannelWebhookInboxEvent,
  ChannelWebhookStatus,
  Prisma,
} from '@prisma/client';

export interface CreateChannelIntegrationData {
  tenantId: string;
  provider: ChannelProvider;
  name: string;
  webhookSecretHash: string;
  createdByUserId: string;
}

export interface CreateChannelWebhookInboxData {
  tenantId: string;
  integrationId: string;
  provider: ChannelProvider;
  providerEventId: string;
  eventType: string;
  status: ChannelWebhookStatus;
  payloadHash: string;
  payloadSummary?: Prisma.InputJsonValue;
  failureReason?: string | null;
}

export interface ListChannelInboxParams {
  tenantId: string;
  page?: number;
  perPage?: number;
  provider?: ChannelProvider;
  status?: ChannelWebhookStatus;
}

export interface PaginatedChannelInboxResult {
  data: ChannelWebhookInboxEvent[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export const CHANNELS_REPOSITORY = Symbol('CHANNELS_REPOSITORY');

export interface ChannelsRepository {
  createIntegration(data: CreateChannelIntegrationData): Promise<ChannelIntegration>;
  listIntegrations(tenantId: string): Promise<ChannelIntegration[]>;
  updateIntegrationStatus(
    id: string,
    tenantId: string,
    status: ChannelIntegrationStatus,
  ): Promise<ChannelIntegration>;
  findActiveIntegrationBySecretHash(
    provider: ChannelProvider,
    secretHash: string,
  ): Promise<ChannelIntegration | null>;
  findInboxByProviderEventId(
    provider: ChannelProvider,
    providerEventId: string,
  ): Promise<ChannelWebhookInboxEvent | null>;
  createInboxEvent(data: CreateChannelWebhookInboxData): Promise<ChannelWebhookInboxEvent>;
  listInbox(params: ListChannelInboxParams): Promise<PaginatedChannelInboxResult>;
}
