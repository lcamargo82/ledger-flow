import {
  Body,
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
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import {
  CreateNotificationWebhookSubscriptionDto,
  NotificationWebhookSecretIssuedResponseDto,
  NotificationWebhookSubscriptionListResponseDto,
  NotificationWebhookSubscriptionMutationResponseDto,
  UpdateNotificationWebhookSubscriptionDto,
} from '../../application/dto/notification-webhook-subscription.dto';
import {
  ListNotificationWebhookDeliveriesQueryDto,
  NotificationWebhookDeliveryListResponseDto,
  NotificationWebhookDeliveryMutationResponseDto,
} from '../../application/dto/notification-webhook-delivery.dto';
import { NotificationWebhookOperationsService } from '../../application/services/notification-webhook-operations.service';
import { NotificationWebhookSubscriptionsService } from '../../application/services/notification-webhook-subscriptions.service';

@ApiTags('Notification webhooks')
@ApiBearerAuth('access-token')
@RequirePermissions('notifications:manage')
@RequireCapabilities(NotificationCapabilities.Manage)
@Controller('notification-webhook-subscriptions')
export class NotificationWebhookSubscriptionsController {
  constructor(
    private readonly subscriptions: NotificationWebhookSubscriptionsService,
    private readonly operations: NotificationWebhookOperationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar assinaturas de webhook do tenant sem expor segredos' })
  @ApiOkResponse({ type: NotificationWebhookSubscriptionListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Sem permissão ou capability para gerenciar webhooks' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.subscriptions.list(user.tenantId) };
  }

  @Post()
  @ApiOperation({ summary: 'Criar assinatura e emitir o segredo uma única vez' })
  @ApiCreatedResponse({ type: NotificationWebhookSecretIssuedResponseDto })
  @ApiConflictResponse({ description: 'Endpoint já cadastrado para o tenant' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotificationWebhookSubscriptionDto,
  ) {
    return this.subscriptions.create(user.tenantId, user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar assinatura do tenant' })
  @ApiOkResponse({ type: NotificationWebhookSubscriptionMutationResponseDto })
  @ApiNotFoundResponse({ description: 'Assinatura inexistente no tenant' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationWebhookSubscriptionDto,
  ) {
    return { subscription: await this.subscriptions.update(user.tenantId, id, dto) };
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Desativar assinatura sem apagar o histórico' })
  @ApiNoContentResponse({ description: 'Assinatura desativada' })
  @ApiNotFoundResponse({ description: 'Assinatura inexistente no tenant' })
  disable(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.disable(user.tenantId, id);
  }

  @Post(':id/rotate-secret')
  @ApiOperation({ summary: 'Rotacionar e emitir um novo segredo uma única vez' })
  @ApiOkResponse({ type: NotificationWebhookSecretIssuedResponseDto })
  @ApiNotFoundResponse({ description: 'Assinatura inexistente no tenant' })
  rotateSecret(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.rotateSecret(user.tenantId, id);
  }

  @Post(':id/test')
  @HttpCode(202)
  @ApiOperation({ summary: 'Agendar uma entrega técnica para validar o endpoint e a assinatura' })
  @ApiAcceptedResponse({ type: NotificationWebhookDeliveryMutationResponseDto })
  @ApiNotFoundResponse({ description: 'Assinatura ativa inexistente no tenant' })
  test(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.operations.test(user.tenantId, user.id, id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Consultar métricas e deliveries recentes sem payloads ou segredos' })
  @ApiOkResponse({ type: NotificationWebhookDeliveryListResponseDto })
  @ApiNotFoundResponse({ description: 'Assinatura inexistente no tenant' })
  listDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListNotificationWebhookDeliveriesQueryDto,
  ) {
    return this.operations.list(user.tenantId, id, query.take);
  }

  @Post(':id/deliveries/:deliveryId/replay')
  @HttpCode(202)
  @ApiOperation({ summary: 'Reprocessar atomicamente uma delivery em DLQ' })
  @ApiAcceptedResponse({ type: NotificationWebhookDeliveryMutationResponseDto })
  @ApiNotFoundResponse({ description: 'Assinatura ou delivery inexistente no tenant' })
  @ApiConflictResponse({ description: 'Delivery não está em DLQ ou replay já reivindicado' })
  replay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
  ) {
    return this.operations.replay(user.tenantId, user.id, id, deliveryId);
  }
}
