import { Server } from 'socket.io';

export function registerTrackingSocket(io: Server) {
  io.on('connection', socket => {
    socket.on('ride:join', ({ rideId }) => socket.join(`ride:${rideId}`));

    socket.on('driver:location', payload => {
      // TODO: validate JWT, persist to Redis GEO, calculate ETA, broadcast.
      io.to(`ride:${payload.rideId}`).emit('ride:driver_location', payload);
    });

    socket.on('driver:status', payload => {
      io.emit('admin:driver_status', payload);
    });

    socket.on('safety:sos', payload => {
      io.emit('admin:sos_alert', payload);
    });
  });
}
