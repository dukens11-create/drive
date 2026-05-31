import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware';
import { authRoutes, ridesRoutes, driversRoutes, paymentsRoutes, walletRoutes, kycRoutes, safetyRoutes, supportRoutes, merchantRoutes, marketplaceRoutes, adminRoutes, scheduledRoutes, subscriptionRoutes, loyaltyRoutes, corporateRoutes, carpoolRoutes, fraudRoutes, analyticsRoutes, twofaRoutes, restaurantsRoutes } from './routes';
import { registerTrackingSocket } from './websocket';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300 }));

  app.get('/health', (_, res) => res.json({ ok: true, service: 'flupflap-ride-v7' }));
  app.get('/livez', (_, res) => res.json({ ok: true }));
  app.get('/readyz', (_, res) => res.json({ ok: true, uptimeSeconds: parseFloat(process.uptime().toFixed(3)) }));

  app.use('/api/auth', authRoutes);
  app.use('/api/rides', ridesRoutes);
  app.use('/api/drivers', driversRoutes);
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
  app.use('/api', restaurantsRoutes);

  registerTrackingSocket(io);
  app.use(errorHandler);

  return { app, httpServer, io };
}
