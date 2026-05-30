import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { store } from '../database/data.store';
import { env } from '../config/env';

export function registerTrackingSocket(io: Server) {
  io.use((socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers.authorization;
    const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
    if (!token) return next(new Error('Missing auth token'));
    try {
      (socket.data as any).user = jwt.verify(token, env.jwtSecret);
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', socket => {
    socket.on('ride:join', ({ rideId }) => {
      if (!rideId) return;
      const ride = store.rides.get(rideId);
      if (!ride) return;

      const user = (socket.data as any).user;
      const userId = user?.sub;
      const role = user?.role;
      const allowed = role === 'admin' || ride.riderId === userId || ride.driverId === userId;
      if (!allowed) return;

      socket.join(`ride:${rideId}`);
    });

    socket.on('driver:location', payload => {
      if (!payload?.rideId) return;
      const ride = store.rides.get(payload.rideId);
      if (!ride) return;

      const userId = (socket.data as any).user?.sub;
      if (!ride.driverId || ride.driverId !== userId) return;

      io.to(`ride:${payload.rideId}`).emit('ride:driver_location', {
        rideId: payload.rideId,
        lat: payload.lat,
        lng: payload.lng,
        heading: payload.heading,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on('driver:status', payload => {
      const user = (socket.data as any).user;
      if (user?.role !== 'driver' && user?.role !== 'admin') return;
      io.emit('admin:driver_status', {
        driverId: payload?.driverId || user?.sub,
        available: payload?.available,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on('safety:sos', payload => {
      io.emit('admin:sos_alert', {
        rideId: payload?.rideId,
        userId: payload?.userId || (socket.data as any).user?.sub,
        at: new Date().toISOString(),
        level: payload?.level || 'high'
      });
    });
  });
}
