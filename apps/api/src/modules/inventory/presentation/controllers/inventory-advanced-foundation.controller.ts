import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireCapabilities } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import {
  CommerceCapabilities,
  InventoryAdvancedCapabilities,
} from '../../../platform/domain/constants/platform-capabilities';
import {
  InventoryAdvancedFeatureStatusResponseDto,
  InventoryReasonCodesResponseDto,
} from '../../application/dto/inventory-advanced-foundation.dto';
import {
  InventoryAdvancedFeature,
  InventoryAdvancedFeatureService,
} from '../../application/services/inventory-advanced-feature.service';
import {
  InventoryReasonContext,
  getInventoryReasonCodes,
} from '../../domain/constants/inventory-reason-code-registry';

@ApiTags('Inventory Advanced')
@ApiBearerAuth('access-token')
@Controller('inventory')
export class InventoryAdvancedFoundationController {
  constructor(private readonly features: InventoryAdvancedFeatureService) {}

  @Get('advanced/status')
  @RequirePermissions('inventory:read')
  @RequireCapabilities(CommerceCapabilities.InventoryManage)
  @ApiOperation({ summary: 'Consultar flags efetivas da fundação de estoque avançado' })
  @ApiOkResponse({ type: InventoryAdvancedFeatureStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Sem acesso ao módulo de estoque' })
  status() {
    return this.features.status();
  }

  @Get('transfers/reason-codes')
  @RequirePermissions('inventory:transfer')
  @RequireCapabilities(InventoryAdvancedCapabilities.Transfer)
  @ApiOperation({ summary: 'Listar motivos permitidos para transferências' })
  @ApiOkResponse({ type: InventoryReasonCodesResponseDto })
  @ApiNotFoundResponse({ description: 'Feature de transferências desabilitada' })
  transferReasonCodes() {
    this.features.assertEnabled(InventoryAdvancedFeature.TRANSFERS);
    return { data: getInventoryReasonCodes(InventoryReasonContext.TRANSFER) };
  }

  @Get('cycle-counts/reason-codes')
  @RequirePermissions('inventory:cycle-count')
  @RequireCapabilities(InventoryAdvancedCapabilities.CycleCount)
  @ApiOperation({ summary: 'Listar motivos permitidos para inventário cíclico' })
  @ApiOkResponse({ type: InventoryReasonCodesResponseDto })
  @ApiNotFoundResponse({ description: 'Feature de inventário cíclico desabilitada' })
  cycleCountReasonCodes() {
    this.features.assertEnabled(InventoryAdvancedFeature.CYCLE_COUNTS);
    return { data: getInventoryReasonCodes(InventoryReasonContext.CYCLE_COUNT) };
  }
}
