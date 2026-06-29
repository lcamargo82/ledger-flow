import { PrismaClient, Role, Permission } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create or update Platform and Demo Tenants
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'ledgerflow-platform' },
    update: {
      name: 'LedgerFlow Platform',
      kind: 'PLATFORM',
    },
    create: {
      name: 'LedgerFlow Platform',
      slug: 'ledgerflow-platform',
      kind: 'PLATFORM',
    },
  });
  console.log(`Tenant created: ${platformTenant.name}`);

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
    { key: 'platform:access', description: 'Acesso à administração da plataforma' },
    { key: 'platform:tenants:read', description: 'Visualizar tenants da plataforma' },
    { key: 'platform:tenants:update', description: 'Atualizar tenants da plataforma' },
    { key: 'platform:tenants:status', description: 'Alterar status de tenants da plataforma' },
    { key: 'platform:subscriptions:read', description: 'Visualizar assinaturas da plataforma' },
    { key: 'platform:subscriptions:update', description: 'Atualizar assinaturas da plataforma' },
    { key: 'platform:audit:read', description: 'Visualizar logs de auditoria global da plataforma' },
    { key: 'platform:support:read', description: 'Visualizar resumo de suporte dos tenants' },
  ];

  const permissions: Permission[] = [];
  for (const p of permissionsData) {
    const scope = p.key.startsWith('platform:') ? 'PLATFORM' : 'TENANT';
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description, scope: scope as any },
      create: { ...p, scope: scope as any },
    });
    permissions.push(perm);
  }
  console.log(`Permissions created/updated: ${permissions.length}`);

  // 3. Create Roles
  const rolesData = [
    { key: 'OWNER', name: 'Owner', description: 'Proprietário da conta com acesso total', system: true, tenantId: tenant.id },
    { key: 'OWNER', name: 'Owner', description: 'Proprietário da conta com acesso total', system: true, tenantId: platformTenant.id },
    { key: 'FINANCE_OPERATOR', name: 'Financeiro', description: 'Operador financeiro', system: true, tenantId: tenant.id },
    { key: 'SUPPORT_VIEWER', name: 'Suporte', description: 'Acesso apenas leitura para suporte', system: true, tenantId: tenant.id },
    { key: 'DEVELOPER', name: 'Desenvolvedor', description: 'Gerenciamento técnico (API, Webhooks)', system: true, tenantId: tenant.id },
    { key: 'PLATFORM_OWNER', name: 'Platform Owner', description: 'Administrador geral da plataforma', system: true, tenantId: platformTenant.id },
  ];

  const roles: Role[] = [];
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_key: {
          tenantId: r.tenantId,
          key: r.key,
        },
      },
      update: {
        name: r.name,
        description: r.description,
        system: r.system,
      },
      create: {
        tenantId: r.tenantId,
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
  const ownerRoles = roles.filter((r) => r.key === 'OWNER');
  for (const ownerRole of ownerRoles) {
    for (const p of permissions) {
      // Platform owner role should not get PLATFORM permissions implicitly? Wait.
      // The user instruction says: "Garantir que a role OWNER exista e possua todas as permissões normais de tenant já previstas no projeto."
      // So OWNER gets TENANT permissions only, or both if it's the platform tenant? 
      // User says: "Garantir que PLATFORM_OWNER tenha somente permissões `PLATFORM`." and "OWNER Responsável pelas permissões normais de tenant". 
      // So OWNER role gets ONLY TENANT permissions.
      if (p.scope === 'TENANT') {
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
    }
    console.log(`Assigned TENANT permissions to OWNER role for tenant ${ownerRole.tenantId}`);
  }

  // 4.5 Assign platform permissions to PLATFORM_OWNER role
  const platformOwnerRole = roles.find((r) => r.key === 'PLATFORM_OWNER');
  if (platformOwnerRole) {
    const platformPerms = permissions.filter(p => p.key.startsWith('platform:'));
    for (const p of platformPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: platformOwnerRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: platformOwnerRole.id,
          permissionId: p.id,
        },
      });
    }
    console.log('Assigned platform permissions to PLATFORM_OWNER role');
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
  const demoOwnerRole = roles.find((r) => r.key === 'OWNER' && r.tenantId === tenant.id);
  if (demoOwnerRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: ownerUser.id,
          roleId: demoOwnerRole.id,
        },
      },
      update: {},
      create: {
        userId: ownerUser.id,
        roleId: demoOwnerRole.id,
      },
    });
    console.log('Assigned OWNER role to Demo Owner user');
  }

  // 6.5 Create Platform Owner user and assign role
  const platformOwnerEmail = process.env.PLATFORM_ADMIN_EMAIL || 'platform.owner@ledgerflow.local';
  const platformPasswordHash = await bcrypt.hash(process.env.PLATFORM_ADMIN_PASSWORD || 'ChangeMe123!', 10);

  const platformOwnerUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: platformTenant.id,
        email: platformOwnerEmail,
      },
    },
    update: {
      name: 'Platform Admin',
      isPlatformAdmin: true,
    },
    create: {
      tenantId: platformTenant.id,
      name: 'Platform Admin',
      email: platformOwnerEmail,
      passwordHash: platformPasswordHash,
      isPlatformAdmin: true,
      active: true,
    },
  });
  console.log(`Platform Owner user created/verified: ${platformOwnerUser.email}`);

  if (platformOwnerRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: platformOwnerUser.id,
          roleId: platformOwnerRole.id,
        },
      },
      update: {},
      create: {
        userId: platformOwnerUser.id,
        roleId: platformOwnerRole.id,
      },
    });
    console.log('Assigned PLATFORM_OWNER role to Platform Admin user');
  }

  const platformNormalOwnerRole = roles.find((r) => r.key === 'OWNER' && r.tenantId === platformTenant.id);
  if (platformNormalOwnerRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: platformOwnerUser.id,
          roleId: platformNormalOwnerRole.id,
        },
      },
      update: {},
      create: {
        userId: platformOwnerUser.id,
        roleId: platformNormalOwnerRole.id,
      },
    });
    console.log('Assigned OWNER role to Platform Admin user');
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

  // 7.5 Create Demo Tenant Subscription
  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
    create: {
      tenantId: tenant.id,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    },
  });
  console.log(`Demo Tenant Subscription created/verified`);

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
