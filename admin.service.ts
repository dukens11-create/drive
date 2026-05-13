import { listUsersByRole, store } from './data.store';

export async function drivers_pending(_body: any, _params?: any, _query?: any) {
  const pending = Array.from(store.drivers.values()).filter(d => d.status === 'pending');
  return { module: 'admin', action: 'drivers-pending', ok: true, pending };
}

export async function approve_driver(body: any, _params?: any, _query?: any) {
  const profile = store.drivers.get(body?.userId);
  if (!profile) return { module: 'admin', action: 'approve-driver', error: 'driver profile not found' };
  profile.status = body?.approved === false ? 'rejected' : 'approved';
  return { module: 'admin', action: 'approve-driver', ok: true, profile };
}

export async function live_rides(_body: any, _params?: any, _query?: any) {
  const live = Array.from(store.rides.values()).filter(r => r.status === 'requested' || r.status === 'accepted' || r.status === 'started');
  return { module: 'admin', action: 'live-rides', ok: true, live };
}

export async function risk_alerts(_body: any, _params?: any, _query?: any) {
  const alerts = store.safetyIncidents.slice(-50);
  return { module: 'admin', action: 'risk-alerts', ok: true, alerts };
}

export async function refunds(_body: any, _params?: any, _query?: any) {
  const refunds = Array.from(store.payments.values()).filter(p => p.status === 'refunded');
  return { module: 'admin', action: 'refunds', ok: true, refunds, riders: listUsersByRole('rider') };
}
