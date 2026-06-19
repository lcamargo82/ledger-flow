import { Injectable, Logger } from '@nestjs/common';
import {
  Customer,
  GatewayConfiguration,
  PaymentProvider,
} from '@prisma/client';
import { IProviderCustomerReferenceRepository } from '../../domain/interfaces/provider-customer-reference.repository';
import { AsaasApiClient } from '../../infra/clients/asaas-api.client';
import { AsaasCustomerSyncError } from '../../domain/errors/asaas-errors';
import { GatewayCredentialsEncryptionService } from './gateway-credentials-encryption.service';

@Injectable()
export class GatewayCustomerSyncService {
  private readonly logger = new Logger(GatewayCustomerSyncService.name);

  constructor(
    private readonly customerReferenceRepository: IProviderCustomerReferenceRepository,
    private readonly asaasApiClient: AsaasApiClient,
    private readonly credentialsEncryptionService: GatewayCredentialsEncryptionService,
  ) {}

  async syncCustomer(
    customer: Customer,
    gatewayConfiguration: GatewayConfiguration,
  ): Promise<string> {
    if (gatewayConfiguration.provider !== PaymentProvider.ASAAS) {
      throw new Error(
        `[GatewayCustomerSyncService] Provider ${gatewayConfiguration.provider} not supported for sync yet.`,
      );
    }

    const existingRef =
      await this.customerReferenceRepository.findByCustomerAndConfiguration(
        customer.id,
        gatewayConfiguration.id,
      );

    if (existingRef) {
      this.logger.log(
        `[GatewayCustomerSyncService] Customer reference found for provider ${gatewayConfiguration.provider}`,
      );
      return existingRef.providerCustomerId;
    }

    this.logger.log(
      `[GatewayCustomerSyncService] Creating customer in provider ${gatewayConfiguration.provider}`,
    );

    // Decrypt API key
    if (!gatewayConfiguration.encryptedCredentials) {
      throw new AsaasCustomerSyncError(
        'Credenciais não configuradas para o gateway.',
      );
    }

    const credentials = this.credentialsEncryptionService.decrypt(
      gatewayConfiguration.encryptedCredentials,
    );
    const apiKey = credentials['apiKey'];

    if (!apiKey) {
      throw new AsaasCustomerSyncError(
        'Chave da API não encontrada nas credenciais.',
      );
    }

    const payload = {
      name: customer.name,
      email: customer.email || undefined,
      cpfCnpj: customer.document
        ? this.normalizeDocument(customer.document)
        : undefined,
      mobilePhone: customer.phone
        ? this.normalizePhone(customer.phone)
        : undefined,
    };

    const headers = {
      access_token: apiKey,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = await this.asaasApiClient.post(
        '/customers',
        payload,
        headers,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const providerCustomerId = response.id as string;

      if (!providerCustomerId) {
        throw new AsaasCustomerSyncError(
          'Falha ao obter o ID do cliente retornado pelo provider.',
        );
      }

      await this.customerReferenceRepository.create({
        tenantId: customer.tenantId,
        customerId: customer.id,
        gatewayConfigurationId: gatewayConfiguration.id,
        provider: PaymentProvider.ASAAS,
        providerCustomerId,
      });

      this.logger.log(
        `[GatewayCustomerSyncService] Customer created and linked in provider ${gatewayConfiguration.provider}`,
      );
      return providerCustomerId;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `[GatewayCustomerSyncService] Failed to create customer in ${gatewayConfiguration.provider}: ${err.message}`,
      );
      throw new AsaasCustomerSyncError(
        'Não foi possível sincronizar o cliente com o gateway de pagamento.',
      );
    }
  }

  private normalizeDocument(doc: string): string {
    return doc.replace(/\D/g, '');
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
