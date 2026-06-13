import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getSwaggerConfig } from './config/docs/swagger.config';
import { getRedocHtml } from './config/docs/redoc.html';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  const swaggerConfig = getSwaggerConfig();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  
  // Swagger UI
  SwaggerModule.setup('api/docs', app, document);

  const httpAdapter = app.getHttpAdapter();
  // OpenAPI JSON
  httpAdapter.get('/api/openapi.json', (req, res) => {
    res.json(document);
  });

  // Redoc HTML
  httpAdapter.get('/api/reference', (req, res) => {
    res.type('text/html').send(getRedocHtml());
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
