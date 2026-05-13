import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './shared/error-handler';
import { registerTrackingSocket } from './realtime/tracking.socket';

import authRoutes from './modules/auth/auth.routes';
import ridesRoutes from './modules/rides/rides.routes';
import driversRoutes from './modules/drivers/drivers.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import kycRoutes from './modules/kyc/kyc.routes';
import safetyRoutes from './modules/safety/safety.routes';
import supportRoutes from './modules/support/support.routes';
import merchantRoutes from './modules/merchant/merchant.routes';
import marketplaceRoutes from './modules/marketplace/marketplace.routes';
import adminRoutes from './modules/admin/admin.routes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 300 }));

app.get('/health', (_, res) => res.json({ ok: true, service: 'flupflap-ride-v7' }));

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

registerTrackingSocket(io);
app.use(errorHandler);

const port = Number(process.env.PORT || 8080);
httpServer.listen(port, () => console.log(`API V7 running on ${port}`));
