import {
  PrismaClient,
  PaymentProvider,
  GatewayEnvironment,
  GatewayConfigurationStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function encrypt(credentials: Record<string, string>): string {
  const masterKeyBase64 = process.env.GATEWAY_CREDENTIALS_ENCRYPTION_KEY;
  if (!masterKeyBase64) {
    throw new Error('Missing GATEWAY_CREDENTIALS_ENCRYPTION_KEY in .env');
  }

  const masterKey = Buffer.from(masterKeyBase64, 'base64');
  if (masterKey.length !== 32) {
    throw new Error(
      'GATEWAY_CREDENTIALS_ENCRYPTION_KEY must be exactly 32 bytes when decoded from base64.',
    );
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, masterKey, iv);

  const plaintext = JSON.stringify(credentials);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag().toString('base64');
  const ivString = iv.toString('base64');

  return `${ivString}:${authTag}:${encrypted}`;
}

function generateFingerprint(credentials: Record<string, string>): string {
  const sortedKeys = Object.keys(credentials).sort();
  const sortedValues = sortedKeys.map((key) => credentials[key]);
  const combined = sortedValues.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

async function configureAsaasSandbox() {
  console.log('--- Configurando Asaas Sandbox ---');

  const apiKey = process.env.ASAAS_SANDBOX_API_KEY;
  const tenantSlug = process.env.LEDGERFLOW_DEMO_TENANT_SLUG;

  if (!apiKey || !tenantSlug) {
    console.error(
      'ERRO: Faltam as variáveis ASAAS_SANDBOX_API_KEY ou LEDGERFLOW_DEMO_TENANT_SLUG no ambiente.',
    );
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    console.error(`ERRO: Tenant com slug ${tenantSlug} não encontrado.`);
    process.exit(1);
  }

  const credentials = { apiKey };
  const encryptedCredentials = encrypt(credentials);
  const fingerprint = generateFingerprint(credentials);

  const existingConfig = await prisma.gatewayConfiguration.findUnique({
    where: {
      tenantId_provider_environment: {
        tenantId: tenant.id,
        provider: PaymentProvider.ASAAS,
        environment: GatewayEnvironment.SANDBOX,
      },
    },
  });

  if (existingConfig) {
    await prisma.gatewayConfiguration.update({
      where: { id: existingConfig.id },
      data: {
        encryptedCredentials,
        credentialsFingerprint: fingerprint,
        status: GatewayConfigurationStatus.ACTIVE,
        priority: 100,
        supportedMethods: ['PIX', 'BOLETO'],
        displayName: 'Asaas Sandbox (API)',
      },
    });
    console.log('Configuração existente atualizada com sucesso.');
  } else {
    await prisma.gatewayConfiguration.create({
      data: {
        tenantId: tenant.id,
        provider: PaymentProvider.ASAAS,
        environment: GatewayEnvironment.SANDBOX,
        status: GatewayConfigurationStatus.ACTIVE,
        priority: 100,
        supportedMethods: ['PIX', 'BOLETO'],
        displayName: 'Asaas Sandbox',
        encryptedCredentials,
        credentialsFingerprint: fingerprint,
      },
    });
    console.log('Nova configuração criada com sucesso.');
  }

  console.log(
    'Configuração Asaas Sandbox finalizada com sucesso! (Chaves armazenadas em formato criptografado)',
  );
}

configureAsaasSandbox()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
