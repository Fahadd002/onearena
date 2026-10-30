// Load env before any module that reads process.env (Prisma pool, better-auth, etc.)
import config from './config/index';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import qs from 'qs';
import { AppModule } from './app.module';
import { auth } from './app/lib/auth';
import { BookingService } from './app/modules/booking/booking.service';
import { TurfService } from './app/modules/turf/turf.service';
import { TurfSlotService } from './app/modules/turf-slots/turf-slot.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Every scheduled job in the app is registered here
function registerCronJobs(app: NestExpressApplication) {
  const bookingService = app.get(BookingService, { strict: false });
  const turfService = app.get(TurfService, { strict: false });
  const turfSlotService = app.get(TurfSlotService, { strict: false });
  // Every 15 minutes: expire unpaid bookings, then release stale WAITLIST slots
  cron.schedule('*/15 * * * *', async () => {
    await bookingService.expireUnpaid().catch(() => undefined);
    await turfSlotService.cleanupPrebookedSlots().catch(() => undefined);
  });

  // Deactivate turfs of inactive subscriptions: once on startup, then hourly
  const deactivateTurfs = () =>turfService.deactivateTurfsForInactiveSubscriptions().catch(() => undefined);
  
  deactivateTurfs();
  
  cron.schedule('0 * * * *', deactivateTurfs);

  // Hourly: expire AVAILABLE slots whose end time has passed (Dhaka)
  // cron.schedule('0 * * * *', () => turfSlotService.UpdateExpireSlots().catch(() => undefined), {
  //   timezone: CRON_TZ,
  // });

  // Daily rolling slot generation; each turf's calendar date is resolved in its timezone.
  cron.schedule('0 0 * * *', () => turfSlotService.generateRollingSlots().catch(() => undefined));
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.set('trust proxy', true);

  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.set('query parser', (str: string) => qs.parse(str));
  app.setViewEngine('ejs');

  const templatePath = config.env == 'production' ? 'dist/app/templates' : 'src/app/templates';
  app.setBaseViewsDir(path.resolve(process.cwd(), templatePath));
  const betterAuthOrigin = new URL(config.betterAuthUrl).origin;
  app.enableCors({
    origin: [...new Set([...config.frontendOrigins, betterAuthOrigin])],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // better-auth must be mounted before JSON body parsing (same as Express app.ts)
  expressApp.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    if (
      req.method === 'POST' &&
      (req.path === '/sign-in/email' || req.path === '/sign-up/email')
    ) {
      res.status(403).json({
        success: false,
        message: 'Use the CAPTCHA-protected authentication endpoint',
        meta: null,
        data: null,
      });
      return;
    }

    next();
  });
  expressApp.use('/api/auth', toNodeHandler(auth));

  expressApp.use(express.urlencoded({ extended: true }));
  // expressApp.use('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));
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

  const port = Number(config.port) || 4000;
  await app.listen(port);
  registerCronJobs(app);
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
