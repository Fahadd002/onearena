// Load env before any module that reads process.env (Prisma pool, better-auth, etc.)
import config from './config/index';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import path from 'path';
import qs from 'qs';
import { AppModule } from './app.module';
import { auth } from './app/lib/auth';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.set('query parser', (str: string) => qs.parse(str));
  app.setViewEngine('ejs');
  app.setBaseViewsDir(path.resolve(process.cwd(), 'src/app/templates'));

  app.enableCors({
    origin: [
      config.frontendUrl,
      config.betterAuthUrl,
      'http://localhost:3000',
      'http://localhost:5000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // better-auth must be mounted before JSON body parsing (same as Express app.ts)
  expressApp.use('/api/auth', toNodeHandler(auth));

  expressApp.use(express.urlencoded({ extended: true }));
  expressApp.use('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));
  expressApp.use(express.json());
  expressApp.use(cookieParser());
  expressApp.use(express.urlencoded({ extended: true }));

  // Serve uploaded files
  expressApp.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Health check at GET /  same response as Express
  expressApp.get('/', async (_req: Request, res: Response) => {
    res.status(201).json({
      success: true,
      message: 'API is working',
    });
  });

  const port = Number(config.port) || 5000;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);

  const exitHandler = () => {
    app
      .close()
      .then(() => {
        console.log('Server closed gracefully.');
        process.exit(1);
      })
      .catch(() => process.exit(1));
  };

  process.on('SIGTERM', exitHandler);
  process.on('SIGINT', exitHandler);

  process.on('unhandledRejection', (error) => {
    console.log('Unhandled Rejection is detected, we are closing our server...');
    app
      .close()
      .then(() => {
        console.log(error);
        process.exit(1);
      })
      .catch(() => process.exit(1));
  });
}

bootstrap().catch((error) => {
  console.error('Error during server startup:', error);
  process.exit(1);
});
