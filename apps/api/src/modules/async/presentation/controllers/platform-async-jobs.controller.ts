import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { ListAsyncJobsQueryDto } from '../../application/dto/list-async-jobs-query.dto';
import { OutboxRepository } from '../../domain/interfaces/outbox.repository';
import { ReplayAsyncJobDto } from '../../application/dto/replay-async-job.dto';
import { AsyncJobReplayService } from '../../application/services/async-job-replay.service';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { AsyncJobMapper } from '../../application/mappers/async-job.mapper';

@ApiTags('Platform Async Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('platform/async-jobs')
export class PlatformAsyncJobsController {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly replayService: AsyncJobReplayService,
  ) {}

  @Get()
  @RequirePermissions('platform:async:read')
  @ApiOperation({ summary: 'List async jobs' })
  async listJobs(@Query() query: ListAsyncJobsQueryDto) {
    const where: any = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.status) where.status = query.status;
    if (query.eventType) where.eventType = query.eventType;

    const result = await this.outboxRepository.paginate({ where, orderBy: { createdAt: 'desc' } });

    return {
      items: result.items.map(AsyncJobMapper.toResponseDto),
      total: result.total,
    };
  }

  @Post(':id/replay')
  @RequirePermissions('platform:async:replay')
  @ApiOperation({ summary: 'Replay failed async job' })
  async replayJob(@Param('id') id: string, @CurrentUser() user: any) {
    return this.replayService.replayEvent(id, user.tenantId);
  }
}
