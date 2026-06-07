<<<<<<< HEAD
/**
 * SMS message templates for all transactional SMS types.
 * Each template function accepts a typed data object and returns a string message.
 * Messages are kept concise to fit within a single SMS segment where possible.
 */

export const smsTemplates = {
  RIDE_REQUEST: (data: {
    pickupStreet: string;
    fareEstimate: number;
  }) =>
    `New ride! Pickup at ${data.pickupStreet}. Earn $${(data.fareEstimate / 100).toFixed(2)} 🚕 Accept in app`,

  DRIVER_ARRIVING: (data: {
    carColor: string;
    carMake: string;
    licensePlate: string;
  }) =>
    `Driver here! ${data.carColor} ${data.carMake}, plate ${data.licensePlate}. Look outside 👀`,

  PAYMENT_FAILED: (data: {
    reason?: string;
    updateLink?: string;
  }) =>
    `Payment failed ❌${data.reason ? ` ${data.reason}.` : ''} Update your card in the Drive app${data.updateLink ? `: ${data.updateLink}` : ''}`,

  OTP_CODE: (data: {
    code: string;
    validMinutes?: number;
  }) =>
    `Your Drive verification code is: ${data.code}. Valid for ${data.validMinutes ?? 10} minutes.`,

  SCHEDULED_RIDE_REMINDER: (data: {
    pickupStreet: string;
    minutesUntil: number;
  }) =>
    `Reminder: Your ride from ${data.pickupStreet} in ${data.minutesUntil} mins. Confirm in app.`,

  DRIVER_EARNINGS_SUMMARY: (data: {
    earnings: number;
    trips: number;
    balance?: number;
  }) =>
    `Today's earnings: $${(data.earnings / 100).toFixed(2)} from ${data.trips} trips.${data.balance !== undefined ? ` Balance: $${(data.balance / 100).toFixed(2)}.` : ''} Details in app 💰`,

  SUPPORT_REPLY: (data: {
    ticketNumber: string;
    preview: string;
  }) =>
    `Support replied to ticket #${data.ticketNumber}: ${data.preview} View in app`,

  SUPPORT_TICKET_CREATED: (data: {
    ticketNumber: string;
    responseTimeHours?: number;
  }) =>
    `Support ticket #${data.ticketNumber} created. We'll respond within ${data.responseTimeHours ?? 1} hour${(data.responseTimeHours ?? 1) === 1 ? '' : 's'}.`,

  SCHEDULED_RIDE_DISPATCH: (data: {
    minutesUntil: number;
  }) =>
    `Good news! Driver assigned to your scheduled ride. Pickup in ${data.minutesUntil} mins.`,

  PAYMENT_SUCCESS: (data: {
    amount: number;
    rideId?: string;
  }) =>
    `Payment of $${(data.amount / 100).toFixed(2)} confirmed for your Drive trip. Thank you!`
=======
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
>>>>>>> origin/main
};
