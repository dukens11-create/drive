type NotificationTemplate = {
  title: string;
  body: string;
  data: Record<string, string>;
};

export const notificationTemplates = {
  RIDE_REQUEST: (data: any): NotificationTemplate => ({
    title: 'New Ride Request',
    body: `Pickup at ${data.pickupAddress || 'pickup point'}. Earn $${((Number(data.fareEstimate) || 0) / 100).toFixed(2)}`,
    data: {
      rideId: String(data.rideId || ''),
      action: 'RIDE_REQUEST',
      pickupLat: String(data.pickupLat || ''),
      pickupLng: String(data.pickupLng || ''),
      fareEstimate: String(data.fareEstimate || '')
    }
  }),
  DRIVER_ACCEPTED: (data: any): NotificationTemplate => ({
    title: 'Driver Accepted!',
    body: `${data.driverName || 'Your driver'} is on the way (${String(data.eta || 2)} min away)`,
    data: {
      driverId: String(data.driverId || ''),
      rideId: String(data.rideId || ''),
      action: 'DRIVER_ACCEPTED',
      driverLat: String(data.driverLat || ''),
      driverLng: String(data.driverLng || ''),
      eta: String(data.eta || 2)
    }
  }),
  DRIVER_ARRIVING: (data: any): NotificationTemplate => ({
    title: 'Driver is Here',
    body: `Look for plate ${data.plateNumber || 'your driver vehicle'}`,
    data: {
      rideId: String(data.rideId || ''),
      action: 'DRIVER_ARRIVED',
      plateNumber: String(data.plateNumber || ''),
      carColor: String(data.carColor || '')
    }
  }),
  RIDE_COMPLETED: (data: any): NotificationTemplate => ({
    title: 'Trip Complete',
    body: 'Rate your trip and earn loyalty points',
    data: {
      rideId: String(data.rideId || ''),
      action: 'RATE_RIDE',
      totalFare: String(data.totalFare || ''),
      driverEarnings: String(data.driverEarnings || '')
    }
  }),
  CHAT_MESSAGE: (data: any): NotificationTemplate => ({
    title: `Message from ${data.senderName || 'your contact'}`,
    body: String(data.messagePreview || 'Open app to view message'),
    data: {
      conversationId: String(data.conversationId || ''),
      senderId: String(data.senderId || ''),
      messageId: String(data.messageId || ''),
      action: 'NEW_MESSAGE'
    }
  }),
  SUPPORT_REPLY: (data: any): NotificationTemplate => ({
    title: 'Support Team Replied',
    body: String(data.replyPreview || 'Open your ticket to review the update'),
    data: {
      ticketId: String(data.ticketId || ''),
      action: 'SUPPORT_REPLY'
    }
  })
};
