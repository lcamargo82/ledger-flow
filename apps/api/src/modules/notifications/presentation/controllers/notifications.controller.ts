import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { RequireCapabilities } from '../../../auth/presentation/decorators/require-capabilities.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { NotificationCapabilities } from '../../../platform/domain/constants/platform-capabilities';
import { ListNotificationsQueryDto } from '../../application/dto/list-notifications-query.dto';
import {
  NotificationFeedResponseDto,
  NotificationUnreadCountResponseDto,
} from '../../application/dto/notification-response.dto';
import { NotificationFeedService } from '../../application/services/notification-feed.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@RequirePermissions('notifications:read')
@RequireCapabilities(NotificationCapabilities.Read)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly feed: NotificationFeedService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações atualmente autorizadas do usuário' })
  @ApiOkResponse({ type: NotificationFeedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability de notificações' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return this.feed.list(user.tenantId, user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contar notificações não lidas atualmente autorizadas' })
  @ApiOkResponse({ type: NotificationUnreadCountResponseDto })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.feed.unreadCount(user.tenantId, user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida de forma idempotente' })
  @ApiOkResponse({ description: 'Notificação marcada como lida' })
  @ApiNotFoundResponse({ description: 'Notificação inexistente ou não autorizada' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.feed.markRead(user.tenantId, user.id, id);
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar todas as notificações visíveis como lidas' })
  @ApiOkResponse({ description: 'Quantidade de notificações atualizadas' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.feed.markAllRead(user.tenantId, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Descartar uma notificação de forma idempotente' })
  @ApiNoContentResponse({ description: 'Notificação descartada' })
  @ApiNotFoundResponse({ description: 'Notificação inexistente ou não autorizada' })
  async dismiss(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.feed.dismiss(user.tenantId, user.id, id);
  }
}
