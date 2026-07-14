import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { RequireCapabilities } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import {
  SalesIntelligencePolicyDto,
  UpdateSalesIntelligencePolicyDto,
} from '../../application/dto/update-sales-intelligence-policy.dto';
import { SalesIntelligencePolicyService } from '../../application/services/sales-intelligence-policy.service';

@ApiTags('Sales Intelligence')
@ApiBearerAuth('access-token')
@Controller('sales-intelligence/policy')
@RequireCapabilities(CommerceCapabilities.SalesIntelligenceRead)
export class SalesIntelligencePolicyController {
  constructor(private readonly service: SalesIntelligencePolicyService) {}

  @Get()
  @RequirePermissions('sales-intelligence:read')
  @ApiOperation({ summary: 'Consultar política de alertas de vendas do tenant' })
  @ApiOkResponse({ type: SalesIntelligencePolicyDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getPolicy(user.tenantId);
  }

  @Patch()
  @RequirePermissions('sales-intelligence:manage-policy')
  @ApiOperation({ summary: 'Atualizar política de alertas de vendas do tenant' })
  @ApiOkResponse({ type: SalesIntelligencePolicyDto })
  update(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateSalesIntelligencePolicyDto) {
    return this.service.updatePolicy(user.tenantId, input);
  }
}
