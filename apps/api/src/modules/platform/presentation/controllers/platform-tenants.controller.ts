import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { PlatformTenantsService } from '../../application/services/platform-tenants.service';
import { ListPlatformTenantsQueryDto } from '../../application/dto/list-platform-tenants-query.dto';
import { UpdatePlatformTenantDto } from '../../application/dto/update-platform-tenant.dto';
import { UpdatePlatformTenantStatusDto } from '../../application/dto/update-platform-tenant-status.dto';
import { UpdateTenantSubscriptionDto } from '../../application/dto/update-tenant-subscription.dto';
import { PlatformAdminOnly } from '../../../auth/presentation/decorators/platform-admin-only.decorator';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/application/types/authenticated-user.type';
import { PaginatedPlatformTenantsResponseDto } from '../../application/dto/paginated-platform-tenants-response.dto';
import { PlatformTenantResponseDto } from '../../application/dto/platform-tenant-response.dto';
import { PlatformTenantDetailsResponseDto } from '../../application/dto/platform-tenant-details-response.dto';
import { CreatePlatformTenantDto } from '../../application/dto/create-platform-tenant.dto';
import { TenantProvisioningService } from '../../application/services/tenant-provisioning.service';
import { PlatformTenantOverviewResponseDto } from '../../application/dto/platform-tenant-overview-response.dto';
import { PlatformTenantHealthResponseDto } from '../../application/dto/platform-tenant-health-response.dto';
import { PlatformTenantActivityResponseDto } from '../../application/dto/platform-tenant-activity-response.dto';

@ApiTags('Platform Administration')
@ApiBearerAuth('access-token')
@PlatformAdminOnly()
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(
    private readonly service: PlatformTenantsService,
    private readonly provisioningService: TenantProvisioningService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('platform:tenants:create')
  @ApiOperation({ summary: 'Provision a new customer tenant' })
  @ApiOkResponse({ description: 'Tenant successfully provisioned' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  createTenant(@Body() dto: CreatePlatformTenantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.provisioningService.provisionCustomerTenant(dto, user.id);
  }

  @Get()
  @RequirePermissions('platform:tenants:read')
  @ApiOperation({ summary: 'List platform tenants' })
  @ApiOkResponse({ type: PaginatedPlatformTenantsResponseDto })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  findAll(@Query() query: ListPlatformTenantsQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('platform:tenants:read')
  @ApiOperation({ summary: 'Get platform tenant details' })
  @ApiOkResponse({ type: PlatformTenantDetailsResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user.id);
  }

  @Patch(':id')
  @RequirePermissions('platform:tenants:update')
  @ApiOperation({ summary: 'Update platform tenant' })
  @ApiOkResponse({ type: PlatformTenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiConflictResponse({
    description: 'The platform tenant cannot be modified through this endpoint.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('platform:tenants:status')
  @ApiOperation({
    summary: 'Update platform tenant status (activate/deactivate)',
  })
  @ApiOkResponse({ type: PlatformTenantResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiConflictResponse({
    description: 'The platform tenant cannot be modified through this endpoint.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformTenantStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, dto, user.id);
  }

  @Patch(':id/subscription')
  @RequirePermissions('platform:subscriptions:update')
  @ApiOperation({ summary: 'Update platform tenant subscription' })
  @ApiOkResponse({ type: PlatformTenantDetailsResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiBadRequestResponse({
    description: 'Subscription period end must be after the start date.',
  })
  @ApiConflictResponse({
    description: 'The platform tenant cannot be modified through this endpoint.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateTenantSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateSubscription(id, dto, user.id);
  }

  @Get(':id/overview')
  @RequirePermissions('platform:tenants:overview:read')
  @ApiOperation({ summary: 'Get operational overview of a tenant' })
  @ApiOkResponse({ type: PlatformTenantOverviewResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  getOverview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getTenantOverview(id, user.id);
  }

  @Get(':id/health')
  @RequirePermissions('platform:tenants:health:read')
  @ApiOperation({ summary: 'Get operational health of a tenant' })
  @ApiOkResponse({ type: PlatformTenantHealthResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  getHealth(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getTenantHealth(id, user.id);
  }

  @Get(':id/activity')
  @RequirePermissions('platform:tenants:overview:read')
  @ApiOperation({ summary: 'Get recent operational activity of a tenant' })
  @ApiOkResponse({ type: PlatformTenantActivityResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found.' })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access platform administration.',
  })
  getActivity(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getTenantActivity(id, user.id);
  }
}
