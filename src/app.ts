import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { errorHandler } from './middleware';
import { authRoutes, ridesRoutes, driversRoutes, ridersRoutes, paymentsRoutes, walletRoutes, kycRoutes, safetyRoutes, supportRoutes, merchantRoutes, marketplaceRoutes, adminRoutes, scheduledRoutes, subscriptionRoutes, loyaltyRoutes, corporateRoutes, carpoolRoutes, fraudRoutes, analyticsRoutes, twofaRoutes, chatRoutes, notificationsRoutes, mlRoutes, i18nRoutes, restaurantsRoutes } from './routes';
import { registerTrackingSocket, registerChatSocket } from './websocket';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

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
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300 }));

  // Serve static files BEFORE routes
  const publicPath = path.join(process.cwd(), 'public');
  console.log('🔍 [STATIC] Serving static files from:', publicPath);
  app.use(express.static(publicPath));

  app.get('/health', (_, res) => res.json({ ok: true, service: 'flupflap-ride-v7' }));
  app.get('/livez', (_, res) => res.json({ ok: true }));
  app.get('/readyz', (_, res) => res.json({ ok: true, uptimeSeconds: parseFloat(process.uptime().toFixed(3)) }));

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
}
