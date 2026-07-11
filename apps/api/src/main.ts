import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getSwaggerConfig } from './config/docs/swagger.config';
import { getRedocHtml } from './config/docs/redoc.html';
import type { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = getSwaggerConfig();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'LedgerFlow API',
  });

  const httpAdapter = app.getHttpAdapter();
  // OpenAPI JSON
  httpAdapter.get('/api/openapi.json', (req: Request, res: Response) => {
    res.json(document);
  });

  // Redoc HTML
  httpAdapter.get('/api/reference', (req: Request, res: Response) => {
    res.type('text/html').send(getRedocHtml());
  });

  const host = process.env.API_HOST ?? '0.0.0.0';
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);

  await app.listen(port, host);
}
bootstrap().catch((err) => {
  console.error('Error starting server', err);
});
