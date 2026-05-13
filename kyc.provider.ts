export async function createKycSession(userId: string) {
  return {
    userId,
    provider: process.env.KYC_PROVIDER || 'stripe_identity',
    url: 'TODO_PROVIDER_SESSION_URL'
  };
}

export async function handleKycWebhook(event: any) {
  return { handled: true, event };
}
