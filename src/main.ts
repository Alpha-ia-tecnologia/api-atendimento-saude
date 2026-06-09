import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { PrismaExceptionFilter } from './shared/filters/prisma-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { RequestLoggingInterceptor } from './shared/interceptors/request-logging.interceptor';

async function bootstrap() {
  // Desliga o body-parser automático pra controlar o limite por rota (abaixo).
  const app = await NestFactory.create(AppModule, { bufferLogs: false, bodyParser: false });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  // O webhook do WhatsApp (Evolution) embute a mídia em base64 no corpo — bem
  // maior que o default do body-parser (100kb), o que fazia a entrega da foto
  // estourar com 413 antes de chegar no controller. Limite generoso só nessa
  // rota; o resto da API fica num teto modesto.
  const webhookLimit = configService.get<string>('WEBHOOK_BODY_LIMIT', '25mb');
  app.use('/webhooks/whatsapp', json({ limit: webhookLimit }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // `CORS_ORIGIN=*` (ou vazio) → reflete qualquer origem (origin: true). Uma
  // lista separada por vírgula → só essas origens. Importante: o array `['*']`
  // NÃO funciona como curinga no pacote `cors` (faz match exato), por isso o
  // caso `*` precisa virar `true`.
  const corsOrigin = configService.get<string>('CORS_ORIGIN')?.trim();
  const origin =
    !corsOrigin || corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim());
  app.enableCors({ origin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor(), new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Modular Monolith API')
    .setDescription('API NestJS modular com Prisma + PostgreSQL')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization' },
      'bearer',
    )
    .addTag('Auth Maria (paciente)')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Silence unused-import warnings for Reflector (kept for future global guard wiring if needed)
  void Reflector;

  const port = Number(configService.get<string>('PORT', '3000'));
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
