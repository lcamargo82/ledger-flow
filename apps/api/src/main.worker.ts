import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  process.env.IS_WORKER = 'true';
  // Use NestFactory.createApplicationContext to run without HTTP server
  const app = await NestFactory.createApplicationContext(AppModule);

  // The OutboxDispatcherService and RabbitMQConsumer will automatically start
  // because they implement OnApplicationBootstrap
  console.log('async.worker.started');
}
bootstrap();
