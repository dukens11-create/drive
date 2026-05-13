import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './error-handler';
import { registerTrackingSocket } from './tracking.socket';

import authRoutes from './auth.routes';
import ridesRoutes from './rides.routes';
import driversRoutes from './drivers.routes';
import paymentsRoutes from './payments.routes';
import walletRoutes from './wallet.routes';
import kycRoutes from './kyc.routes';
import safetyRoutes from './safety.routes';
import supportRoutes from './support.routes';
import merchantRoutes from './merchant.routes';
import marketplaceRoutes from './marketplace.routes';
import adminRoutes from './admin.routes';

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
