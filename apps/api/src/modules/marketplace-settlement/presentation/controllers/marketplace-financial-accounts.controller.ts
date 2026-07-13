import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { RequireCapabilities } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { ReconciliationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import {
  CashLedgerEntriesResponseDto,
  CashPositionAdjustmentResponseDto,
  CreateCashPositionAdjustmentDto,
  CreateMarketplaceFinancialAccountDto,
  ListCashLedgerEntriesQueryDto,
  MarketplaceFinancialAccountMutationResponseDto,
  MarketplaceFinancialAccountsResponseDto,
} from '../../application/dto/marketplace-financial-accounts.dto';
import { MarketplaceFinancialAccountsService } from '../../application/services/marketplace-financial-accounts.service';

@ApiTags('Marketplace Settlement')
@ApiBearerAuth('access-token')
@Controller('marketplace-settlement/financial-accounts')
export class MarketplaceFinancialAccountsController {
  constructor(private readonly accountsService: MarketplaceFinancialAccountsService) {}

  @Get()
  @RequirePermissions('marketplace-settlement:read')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementRead)
  @ApiOperation({ summary: 'Listar contas financeiras operacionais de marketplace' })
  @ApiOkResponse({ type: MarketplaceFinancialAccountsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.accountsService.listAccounts(user.tenantId) };
  }

  @Post()
  @RequirePermissions('marketplace-settlement:manage')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementManage)
  @ApiOperation({ summary: 'Criar conta financeira Mercado Pago com saldo inicial auditado' })
  @ApiCreatedResponse({ type: MarketplaceFinancialAccountMutationResponseDto })
  @ApiBadRequestResponse({ description: 'Conta não está settlement-ready ou dados inválidos' })
  @ApiConflictResponse({ description: 'Nome de conta já cadastrado' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMarketplaceFinancialAccountDto,
  ) {
    const result = await this.accountsService.createAccount(user.tenantId, user.id, dto);
    return {
      account: this.accountsService.mapAccount(result.account),
      ledgerEntry: this.accountsService.mapLedgerEntry(result.ledgerEntry),
    };
  }

  @Get(':id/ledger')
  @RequirePermissions('marketplace-settlement:read')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementRead)
  @ApiOperation({ summary: 'Listar ledger append-only de uma conta financeira' })
  @ApiOkResponse({ type: CashLedgerEntriesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  listLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListCashLedgerEntriesQueryDto,
  ) {
    return this.accountsService.listLedgerEntries(user.tenantId, id, query);
  }

  @Post(':id/adjustments')
  @RequirePermissions('marketplace-settlement:manage')
  @RequireCapabilities(ReconciliationCapabilities.MarketplaceSettlementManage)
  @ApiOperation({ summary: 'Registrar ajuste manual append-only na posição de caixa' })
  @ApiCreatedResponse({ type: CashPositionAdjustmentResponseDto })
  @ApiBadRequestResponse({ description: 'Ajuste inválido' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de marketplace settlement' })
  async createAdjustment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateCashPositionAdjustmentDto,
  ): Promise<CashPositionAdjustmentResponseDto> {
    const adjustment = await this.accountsService.createAdjustment(user.tenantId, user.id, id, dto);
    return {
      id: adjustment.id,
      type: adjustment.type,
      amountMinor: adjustment.amountMinor.toString(),
      reasonCode: adjustment.reasonCode,
      notes: adjustment.notes,
      ledgerEntry: this.accountsService.mapLedgerEntry(adjustment.cashLedgerEntry),
    };
  }
}
