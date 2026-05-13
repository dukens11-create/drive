import { Server } from 'socket.io';

export function registerTrackingSocket(io: Server) {
  io.on('connection', socket => {
    socket.on('ride:join', ({ rideId }) => {
      if (!rideId) return;
      socket.join(`ride:${rideId}`);
    });

    socket.on('driver:location', payload => {
      if (!payload?.rideId) return;
      io.to(`ride:${payload.rideId}`).emit('ride:driver_location', {
        rideId: payload.rideId,
        lat: payload.lat,
        lng: payload.lng,
        heading: payload.heading,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on('driver:status', payload => {
      io.emit('admin:driver_status', {
        driverId: payload?.driverId,
        available: payload?.available,
        updatedAt: new Date().toISOString()
      });
    });

    socket.on('safety:sos', payload => {
      io.emit('admin:sos_alert', {
        rideId: payload?.rideId,
        userId: payload?.userId,
        at: new Date().toISOString(),
        level: payload?.level || 'high'
      });
    });
  });
}
