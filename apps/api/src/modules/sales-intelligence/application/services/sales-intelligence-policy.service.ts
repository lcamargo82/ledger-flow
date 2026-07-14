import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { UpdateSalesIntelligencePolicyDto } from '../dto/update-sales-intelligence-policy.dto';

const DEFAULT_POLICY = {
  lowMarginEnabled: true,
  lowMarginThreshold: '10.00',
} as const;

@Injectable()
export class SalesIntelligencePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(tenantId: string) {
    const policy = await this.prisma.salesIntelligencePolicy.findUnique({ where: { tenantId } });
    return policy ? this.serialize(policy) : { ...DEFAULT_POLICY };
  }

  async updatePolicy(tenantId: string, input: UpdateSalesIntelligencePolicyDto) {
    const policy = await this.prisma.salesIntelligencePolicy.upsert({
      where: { tenantId },
      create: {
        tenantId,
        lowMarginEnabled: input.lowMarginEnabled,
        lowMarginThreshold: new Prisma.Decimal(input.lowMarginThreshold),
      },
      update: {
        lowMarginEnabled: input.lowMarginEnabled,
        lowMarginThreshold: new Prisma.Decimal(input.lowMarginThreshold),
      },
    });
    return this.serialize(policy);
  }

  private serialize(policy: { lowMarginEnabled: boolean; lowMarginThreshold: Prisma.Decimal }) {
    return {
      lowMarginEnabled: policy.lowMarginEnabled,
      lowMarginThreshold: policy.lowMarginThreshold.toFixed(2),
    };
  }
}
