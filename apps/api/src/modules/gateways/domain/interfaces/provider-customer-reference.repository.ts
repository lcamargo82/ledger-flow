import { GatewayCustomerReference, Prisma } from '@prisma/client';

export abstract class IProviderCustomerReferenceRepository {
  abstract findByCustomerAndConfiguration(
    customerId: string,
    gatewayConfigurationId: string,
  ): Promise<GatewayCustomerReference | null>;

  abstract create(
    data: Prisma.GatewayCustomerReferenceUncheckedCreateInput,
  ): Promise<GatewayCustomerReference>;
}
