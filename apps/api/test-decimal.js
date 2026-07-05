const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const dec = new Prisma.Decimal('55.5');
console.log('Value:', Number(dec));
console.log('Is NaN:', isNaN(Number(dec)));
