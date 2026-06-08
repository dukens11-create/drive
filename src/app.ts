import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { errorHandler, wrapRouterAsyncHandlers } from './middleware';
import { env } from './config';
import { authRoutes, ridesRoutes, driversRoutes, ridersRoutes, paymentsRoutes, walletRoutes, kycRoutes, safetyRoutes, supportRoutes, merchantRoutes, marketplaceRoutes, adminRoutes, scheduledRoutes, searchRoutes, subscriptionRoutes, loyaltyRoutes, corporateRoutes, carpoolRoutes, fraudRoutes, analyticsRoutes, twofaRoutes, chatRoutes, notificationsRoutes, mlRoutes, i18nRoutes, restaurantsRoutes } from './routes';
import { getErrorDetails, logger } from './utils';
import { registerTrackingSocket, registerChatSocket } from './websocket';
import { initializeFCM } from './services/fcm.service';
import { stripeWebhookHandler } from './webhooks/stripe.webhook';

export function createApp() {
  try {
    const app = express();
    const allowedCorsOrigins = (env.corsAllowedOrigins || '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        credentials: true,
        origin: allowedCorsOrigins.length > 0 ? allowedCorsOrigins : true
      }
    });
    initializeFCM();

    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: ["'self'", 'https://api.mapbox.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://api.mapbox.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://api.mapbox.com', 'https://*.tiles.mapbox.com'],
          workerSrc: ["'self'", 'blob:'],
          connectSrc: [
            "'self'",
            'https://*.firebaseio.com',
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'https://api.mapbox.com',
            'https://events.mapbox.com',
            'https://*.tiles.mapbox.com'
          ]
        }
      }
    }));
    app.use(cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedCorsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      }
    }));
    app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);
    app.use(express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf.toString('utf8');
      }
    }));
    app.use(rateLimit({ windowMs: 60_000, limit: 300 }));
    app.use((req, res, next) => {
      const startedAt = Date.now();
      logger.info('request started', {
        method: req.method,
        url: req.originalUrl || req.url
      });

      res.on('finish', () => {
        logger.info('request completed', {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt
        });
      });

      next();
    });

    // Serve static files BEFORE routes
    const publicPath = path.join(process.cwd(), 'public');
    logger.debug('serving static files', { publicPath });
    app.use(express.static(publicPath));

    app.get('/health', (_, res) => res.json({ ok: true, service: 'flupflap-ride-v7' }));
    app.get('/livez', (_, res) => res.json({ ok: true }));
    app.get('/readyz', (_, res) => res.json({ ok: true, uptimeSeconds: parseFloat(process.uptime().toFixed(3)) }));

    const routers = [
      authRoutes,
      ridesRoutes,
      driversRoutes,
      ridersRoutes,
      paymentsRoutes,
      walletRoutes,
      kycRoutes,
      safetyRoutes,
      supportRoutes,
      merchantRoutes,
      marketplaceRoutes,
      adminRoutes,
      scheduledRoutes,
      searchRoutes,
      subscriptionRoutes,
      loyaltyRoutes,
      corporateRoutes,
      carpoolRoutes,
      fraudRoutes,
      analyticsRoutes,
      twofaRoutes,
      chatRoutes,
      notificationsRoutes,
      mlRoutes,
      i18nRoutes,
      restaurantsRoutes
    ];
    routers.forEach(wrapRouterAsyncHandlers);

    app.use('/api/auth', authRoutes);
    app.use('/api/rides', ridesRoutes);
    app.use('/api/drivers', driversRoutes);
    app.use('/api/riders', ridersRoutes);
    app.use('/api/payments', paymentsRoutes);
    app.use('/api/wallet', walletRoutes);
    app.use('/api/kyc', kycRoutes);
    app.use('/api/safety', safetyRoutes);
    app.use('/api/support', supportRoutes);
    app.use('/api/merchant', merchantRoutes);
    app.use('/api/marketplace', marketplaceRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/scheduled', scheduledRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/subscriptions', subscriptionRoutes);
    app.use('/api/loyalty', loyaltyRoutes);
    app.use('/api/corporate', corporateRoutes);
    app.use('/api/carpool', carpoolRoutes);
    app.use('/api/fraud', fraudRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/2fa', twofaRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api/ml', mlRoutes);
    app.use('/api/i18n', i18nRoutes);
    app.use('/api', restaurantsRoutes);

    // Fallback for SPA - serve index.html for root
    app.get('/', (_, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });

    registerTrackingSocket(io);
    registerChatSocket(io);
    app.use(errorHandler);

    return { app, httpServer, io };
  } catch (error) {
    logger.error('app initialization failed', getErrorDetails(error));
    throw error;
  }
}
