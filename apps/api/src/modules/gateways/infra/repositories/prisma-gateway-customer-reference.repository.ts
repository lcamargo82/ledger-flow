import { Injectable } from '@nestjs/common';
import { GatewayCustomerReference, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { IProviderCustomerReferenceRepository } from '../../domain/interfaces/provider-customer-reference.repository';

@Injectable()
export class PrismaGatewayCustomerReferenceRepository implements IProviderCustomerReferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerAndConfiguration(
    customerId: string,
    gatewayConfigurationId: string,
  ): Promise<GatewayCustomerReference | null> {
    return this.prisma.gatewayCustomerReference.findUnique({
      where: {
        gatewayConfigurationId_customerId: {
          gatewayConfigurationId,
          customerId,
        },
      },
    });
  }

  async create(
    data: Prisma.GatewayCustomerReferenceUncheckedCreateInput,
  ): Promise<GatewayCustomerReference> {
    return this.prisma.gatewayCustomerReference.create({
      data,
    });
  }
}
