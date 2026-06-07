export const smsTemplates = {
  RIDE_REQUEST: (data: any) =>
    `New ride! Pickup at ${data?.pickupStreet || 'pickup point'}. Earn $${((Number(data?.fareEstimate) || 0) / 100).toFixed(2)} 🚕 Accept in app`,

  DRIVER_ARRIVING: (data: any) =>
    `Driver here! ${data?.carColor || ''} ${data?.carMake || 'Vehicle'}, plate ${data?.licensePlate || 'N/A'}. Look outside 👀`,

  PAYMENT_FAILED: (data: any) =>
    `Payment failed ❌ ${data?.reason || ''} Update your card: ${data?.updateLink || ''}`.trim(),

  OTP_CODE: (data: any) =>
    `Your verification code is: ${data?.code || '000000'}. Valid for 10 minutes.`,

  SCHEDULED_RIDE_REMINDER: (data: any) =>
    `Reminder: Your ride from ${data?.pickupStreet || 'pickup location'} in ${Number(data?.minutesUntil) || 30} mins. Confirm in app.`,

  DRIVER_EARNINGS: (data: any) =>
    `Today's earnings: $${((Number(data?.earnings) || 0) / 100).toFixed(2)} from ${Number(data?.trips) || 0} trips. Details in app 💰`,

  SUPPORT_REPLY: (data: any) =>
    `Support replied to ticket #${data?.ticketNumber || 'N/A'}: ${(data?.preview || '').slice(0, 50)} View in app`,

  SCHEDULED_RIDE_DISPATCH: (data: any) =>
    `Good news! Driver assigned to your scheduled ride. Pickup in ${Number(data?.minutesUntil) || 30} mins.`
};
