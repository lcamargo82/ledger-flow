const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'owner@ledgerflow.local';
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`User: ${user.email}`);
  user.roles.forEach(ur => {
    console.log(`Role: ${ur.role.name} (${ur.role.key}) - Tenant: ${ur.role.tenantId}`);
    const perms = ur.role.permissions.map(rp => rp.permission.key);
    console.log(`  Permissions (${perms.length}): ${perms.join(', ')}`);
  });
}

checkUser().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
