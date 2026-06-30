import { DocumentBuilder } from '@nestjs/swagger';

export const getSwaggerConfig = () => {
  return new DocumentBuilder()
    .setTitle('LedgerFlow API')
    .setDescription(
      'Enterprise Payment, Reconciliation & Observability Platform API',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addServer('http://localhost:3010', 'Local Development Server')
    .addTag('App', 'Status básico da API')
    .addTag('Health', 'Endpoints de monitoramento e readiness')
    .addTag('Auth', 'Autenticação de usuários')
    .build();
};
