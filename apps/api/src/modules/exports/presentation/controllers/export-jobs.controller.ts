import { Body, Controller, Get, Header, Param, Post, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CreateExportJobDto } from '../../application/dto/create-export-job.dto';
import {
  ExportJobResponseDto,
  PaginatedExportJobsResponseDto,
} from '../../application/dto/export-job-response.dto';
import { ListExportJobsQueryDto } from '../../application/dto/list-export-jobs-query.dto';
import { ExportJobsService } from '../../application/services/export-jobs.service';

@ApiTags('Exports')
@ApiBearerAuth('access-token')
@Controller('exports')
@RequirePermissions('reports:export')
export class ExportJobsController {
  constructor(private readonly exportJobsService: ExportJobsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar job assíncrono de exportação pesada' })
  @ApiBody({ type: CreateExportJobDto })
  @ApiOkResponse({ type: ExportJobResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão reports:export' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExportJobDto) {
    return this.exportJobsService.createJob(user.tenantId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar jobs de exportação do tenant' })
  @ApiOkResponse({ type: PaginatedExportJobsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  @ApiForbiddenResponse({ description: 'Sem permissão reports:export' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListExportJobsQueryDto) {
    return this.exportJobsService.listJobs(user.tenantId, query);
  }

  @Post('process-pending')
  @ApiOperation({ summary: 'Processar jobs pendentes de exportação do tenant' })
  @ApiOkResponse({
    schema: {
      example: {
        processed: [
          {
            id: 'job-id',
            status: 'COMPLETED',
            rowCount: 150,
          },
        ],
      },
    },
  })
  processPending(@CurrentUser() user: AuthenticatedUser) {
    return this.exportJobsService.processPending(user.tenantId, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar job de exportação ainda pendente' })
  @ApiOkResponse({ type: ExportJobResponseDto })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.exportJobsService.cancelJob(user.tenantId, user.id, id);
  }

  @Get(':id/download')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Baixar arquivo de exportação concluído e não expirado' })
  @ApiOkResponse({ description: 'Arquivo de exportação' })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const download = await this.exportJobsService.downloadJob(user.tenantId, user.id, id);
    response.set({
      'Content-Type': download.mimeType,
      'Content-Length': String(download.size),
      'Content-Disposition': `attachment; filename="${download.fileName}"`,
    });

    return download.stream;
  }
}
