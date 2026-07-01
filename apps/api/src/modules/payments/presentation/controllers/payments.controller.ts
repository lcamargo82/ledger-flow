/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../auth/presentation/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { PaymentsService } from '../../application/services/payments.service';
import { CreatePaymentDto } from '../../application/dto/create-payment.dto';
import { ListPaymentsQueryDto } from '../../application/dto/list-payments-query.dto';
import { RefundPaymentDto } from '../../application/dto/refund-payment.dto';
import { PaymentMapper } from '../../application/mappers/payment.mapper';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Criar um novo pagamento' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique key used to safely retry payment creation.',
    example: 'payment-create-example-001',
  })
  @ApiCreatedResponse({ description: 'Pagamento criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou header ausente.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissão.' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado.' })
  @ApiConflictResponse({ description: 'Conflito de idempotência.' })
  async create(
    @CurrentUser() user: any,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() data: CreatePaymentDto,
  ) {
    const payment = await this.paymentsService.createPayment(
      user.tenantId,
      user.userId,
      idempotencyKey,
      data,
    );
    return { payment: PaymentMapper.toPublic(payment) };
  }

  @Get()
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Listar pagamentos do tenant' })
  @ApiOkResponse({ description: 'Lista de pagamentos retornada.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissão.' })
  async list(@CurrentUser() user: any, @Query() query: ListPaymentsQueryDto) {
    const result = await this.paymentsService.listPayments(
      user.tenantId,
      query,
    );
    return {
      data: result.data.map((p) => PaymentMapper.toPublic(p)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Obter detalhes de um pagamento' })
  @ApiOkResponse({ description: 'Detalhes retornados.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissão.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  async getDetails(@CurrentUser() user: any, @Param('id') id: string) {
    const payment = await this.paymentsService.getPaymentDetails(
      id,
      user.tenantId,
    );
    return { payment: PaymentMapper.toPublicWithEvents(payment) };
  }

  @Get(':id/instructions')
  @RequirePermissions('payments:read')
  @ApiOperation({
    summary: 'Obter instruções de pagamento (PIX Copia e Cola, Boleto)',
  })
  @ApiOkResponse({ description: 'Instruções retornadas.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissão.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  async getInstructions(@CurrentUser() user: any, @Param('id') id: string) {
    const instructions = await this.paymentsService.getPaymentInstructions(
      id,
      user.tenantId,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { providerPaymentId: _, ...sanitizedInstructions } = instructions;
    return { instructions: sanitizedInstructions };
  }

  @Post(':id/cancel')
  @RequirePermissions('payments:cancel')
  @ApiOperation({
    summary: 'Cancelar um pagamento pendente ou em processamento',
  })
  @ApiOkResponse({ description: 'Pagamento cancelado.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissão.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  @ApiConflictResponse({ description: 'Status não permite cancelamento.' })
  async cancel(@CurrentUser() user: any, @Param('id') id: string) {
    const payment = await this.paymentsService.cancelPayment(
      id,
      user.tenantId,
      user.userId,
    );
    return { payment: PaymentMapper.toPublic(payment) };
  }

  @Post(':id/refund')
  @RequirePermissions('payments:refund')
  @ApiOperation({ summary: 'Reembolsar um pagamento aprovado' })
  @ApiOkResponse({ description: 'Pagamento reembolsado.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissão.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  @ApiConflictResponse({ description: 'Status não permite reembolso.' })
  async refund(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: RefundPaymentDto,
  ) {
    const payment = await this.paymentsService.refundPayment(
      id,
      user.tenantId,
      user.userId,
      data,
    );
    return { payment: PaymentMapper.toPublic(payment) };
  }

  @Post(':id/retry-external-charge')
  @RequirePermissions('payments:retry')
  @ApiOperation({
    summary: 'Reprocessar manualmente a criação de uma cobrança externa falha',
  })
  @ApiOkResponse({ description: 'Nova tentativa agendada com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissão.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  @ApiConflictResponse({
    description: 'Pagamento não elegível para reprocessamento.',
  })
  async retryExternalCharge(@CurrentUser() user: any, @Param('id') id: string) {
    const payment = await this.paymentsService.retryExternalCharge(
      id,
      user.tenantId,
      user.userId,
    );
    return { payment: PaymentMapper.toPublicWithEvents(payment) };
  }
}
