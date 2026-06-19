import { PrismaClient, Role, Permission } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create or update Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'ledgerflow-demo' },
    update: {
      name: 'LedgerFlow Demo',
      timezone: 'America/Sao_Paulo',
    },
    create: {
      name: 'LedgerFlow Demo',
      slug: 'ledgerflow-demo',
      timezone: 'America/Sao_Paulo',
    },
  });
  console.log(`Tenant created: ${tenant.name}`);

  // 2. Create Permissions
  const permissionsData = [
    { key: 'auth:login', description: 'Realizar login' },
    { key: 'users:create', description: 'Criar usuários' },
    { key: 'users:read', description: 'Visualizar usuários' },
    { key: 'users:update', description: 'Atualizar usuários' },
    { key: 'users:delete', description: 'Excluir usuários' },
    { key: 'roles:manage', description: 'Gerenciar papéis e permissões' },
    { key: 'permissions:read', description: 'Visualizar permissões' },
    { key: 'customers:create', description: 'Criar clientes' },
    { key: 'customers:read', description: 'Visualizar clientes' },
    { key: 'customers:update', description: 'Atualizar clientes' },
    { key: 'customers:delete', description: 'Excluir clientes' },
    { key: 'payments:create', description: 'Criar pagamentos' },
    { key: 'payments:read', description: 'Visualizar pagamentos' },
    { key: 'payments:cancel', description: 'Cancelar pagamentos' },
    { key: 'payments:refund', description: 'Reembolsar pagamentos' },
    { key: 'reports:export', description: 'Exportar relatórios' },
    { key: 'webhooks:manage', description: 'Gerenciar webhooks' },
    { key: 'api-keys:manage', description: 'Gerenciar chaves de API' },
    { key: 'gateways:manage', description: 'Gerenciar gateways' },
    { key: 'notifications:read', description: 'Visualizar notificações' },
    { key: 'audit:read', description: 'Visualizar trilha de auditoria' },
    { key: 'tenant:update', description: 'Atualizar configurações do tenant' },
  ];

  const permissions: Permission[] = [];
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: p,
    });
    permissions.push(perm);
  }
  console.log(`Permissions created/updated: ${permissions.length}`);

  // 3. Create Roles
  const rolesData = [
    { key: 'OWNER', name: 'Owner', description: 'Proprietário da conta com acesso total', system: true },
    { key: 'FINANCE_OPERATOR', name: 'Financeiro', description: 'Operador financeiro', system: true },
    { key: 'SUPPORT_VIEWER', name: 'Suporte', description: 'Acesso apenas leitura para suporte', system: true },
    { key: 'DEVELOPER', name: 'Desenvolvedor', description: 'Gerenciamento técnico (API, Webhooks)', system: true },
  ];

  const roles: Role[] = [];
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: r.key,
        },
      },
      update: {
        name: r.name,
        description: r.description,
        system: r.system,
      },
      create: {
        tenantId: tenant.id,
        name: r.name,
        key: r.key,
        description: r.description,
        system: r.system,
      },
    });
    roles.push(role);
  }
  console.log(`Roles created/updated: ${roles.length}`);

  // 4. Assign all permissions to OWNER role
  const ownerRole = roles.find((r) => r.key === 'OWNER');
  if (ownerRole) {
    for (const p of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ownerRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: ownerRole.id,
          permissionId: p.id,
        },
      });
    }
    console.log('Assigned all permissions to OWNER role');
  }

  // 5. Create Demo Owner user
  const ownerEmail = 'owner@ledgerflow.local';
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  const ownerUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: ownerEmail,
      },
    },
    update: {
      name: 'Demo Owner',
      // Não atualiza a senha se o usuário já existir para evitar sobrescrever caso tenha sido alterada
    },
    create: {
      tenantId: tenant.id,
      name: 'Demo Owner',
      email: ownerEmail,
      passwordHash: passwordHash,
      active: true,
    },
  });
  console.log(`Demo Owner user created/verified: ${ownerUser.email}`);

  // 6. Assign OWNER role to Demo Owner
  if (ownerRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: ownerUser.id,
          roleId: ownerRole.id,
        },
      },
      update: {},
      create: {
        userId: ownerUser.id,
        roleId: ownerRole.id,
      },
    });
    console.log('Assigned OWNER role to Demo Owner user');
  }

  // 7. Create Demo Customer
  const customer = await prisma.customer.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'demo-customer@ledgerflow.local',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Cliente Demonstrativo',
      email: 'demo-customer@ledgerflow.local',
      document: '00000000000',
      phone: '11999999999',
    },
  });
  console.log(`Demo Customer created/verified: ${customer.name}`);

  // 8. Create Demo Payments
  const paymentsData = [
    {
      reference: 'PAY-DEMO-001',
      amount: 15000,
      method: 'PIX' as any,
      status: 'PENDING' as any,
      description: 'Pagamento Pendente Demo',
      idempotencyKeyHash: await bcrypt.hash('demo-key-1', 10),
    },
    {
      reference: 'PAY-DEMO-002',
      amount: 25050,
      method: 'CARD' as any,
      status: 'APPROVED' as any,
      description: 'Pagamento Aprovado Demo',
      idempotencyKeyHash: await bcrypt.hash('demo-key-2', 10),
    },
    {
      reference: 'PAY-DEMO-003',
      amount: 5000,
      method: 'BOLETO' as any,
      status: 'CANCELED' as any,
      canceledAt: new Date(),
      description: 'Pagamento Cancelado Demo',
      idempotencyKeyHash: await bcrypt.hash('demo-key-3', 10),
    },
    {
      reference: 'PAY-DEMO-004',
      amount: 8990,
      method: 'PIX' as any,
      status: 'REFUNDED' as any,
      refundedAt: new Date(),
      description: 'Pagamento Reembolsado Demo',
      idempotencyKeyHash: await bcrypt.hash('demo-key-4', 10),
    },
  ];

  for (const p of paymentsData) {
    const payment = await prisma.payment.upsert({
      where: {
        tenantId_reference: {
          tenantId: tenant.id,
          reference: p.reference,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        customerId: customer.id,
        reference: p.reference,
        amount: p.amount,
        method: p.method,
        status: p.status,
        description: p.description,
        idempotencyKeyHash: p.idempotencyKeyHash,
        idempotencyRequestHash: 'demo-request-hash',
        canceledAt: p.canceledAt,
        refundedAt: p.refundedAt,
        events: {
          create: {
            tenantId: tenant.id,
            type: `payment.${p.status.toLowerCase()}`,
            currentStatus: p.status,
            message: `Seed generated ${p.status} event`,
          },
        },
      },
    });
  }
  console.log(`Demo Payments created/verified`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
