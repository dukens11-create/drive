export async function handleStripeWebhook(event: any) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      return { handled: true, action: 'mark_payment_captured' };
    case 'account.updated':
      return { handled: true, action: 'update_driver_connect_status' };
    case 'charge.refunded':
      return { handled: true, action: 'mark_refund' };
    default:
      return { handled: false, type: event.type };
  }
}
