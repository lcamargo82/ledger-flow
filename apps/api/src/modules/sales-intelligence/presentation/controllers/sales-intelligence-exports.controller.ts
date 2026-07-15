import { Body, Controller, Get, Header, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExportJobType } from '@prisma/client';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { RequireCapabilities } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { ListExportJobsQueryDto } from '../../../exports/application/dto/list-export-jobs-query.dto';
import { ExportJobsService } from '../../../exports/application/services/export-jobs.service';
import { CommerceCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { CreateSalesIntelligenceExportDto } from '../../application/dto/create-sales-intelligence-export.dto';

@ApiTags('Sales Intelligence')
@ApiBearerAuth('access-token')
@Controller('sales-intelligence/exports')
@RequirePermissions('sales-intelligence:export')
@RequireCapabilities(CommerceCapabilities.SalesIntelligenceRead)
export class SalesIntelligenceExportsController {
  constructor(private readonly exports: ExportJobsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar exportação CSV assíncrona e autorizada por coluna' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() filters: CreateSalesIntelligenceExportDto,
  ) {
    return this.exports.createSalesIntelligenceJob(
      user.tenantId,
      user.id,
      user.permissions,
      filters,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar exportações de inteligência de vendas' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListExportJobsQueryDto) {
    return this.exports.listJobs(user.tenantId, {
      ...query,
      type: ExportJobType.SALES_INTELLIGENCE,
    });
  }

  @Post('process-pending')
  @ApiOperation({ summary: 'Processar exportações pendentes de inteligência de vendas' })
  process(@CurrentUser() user: AuthenticatedUser) {
    return this.exports.processSalesIntelligencePending(user.tenantId, user.id);
  }

  @Get(':id/download')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Baixar CSV de inteligência de vendas concluído' })
  @ApiOkResponse({ description: 'Arquivo CSV' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const download = await this.exports.downloadSalesIntelligenceJob(user.tenantId, user.id, id);
    response.set({
      'Content-Type': download.mimeType,
      'Content-Length': String(download.size),
      'Content-Disposition': `attachment; filename="${download.fileName}"`,
    });
    return download.stream;
  }
}
