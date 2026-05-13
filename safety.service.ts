import { makeId, store, timestamp } from './data.store';

export async function sos(body: any, _params?: any, _query?: any) {
  const incident = {
    id: makeId('sos'),
    userId: body?.userId,
    rideId: body?.rideId,
    lat: body?.lat,
    lng: body?.lng,
    level: body?.level || 'high',
    createdAt: timestamp()
  };
  store.safetyIncidents.push(incident);
  return { module: 'safety', action: 'sos', ok: true, incident };
}

export async function share_trip(body: any, _params?: any, _query?: any) {
  return {
    module: 'safety',
    action: 'share-trip',
    ok: true,
    share: {
      rideId: body?.rideId,
      contact: body?.contact,
      status: 'shared',
      at: timestamp()
    }
  };
}

export async function incident_report(body: any, _params?: any, _query?: any) {
  const report = {
    id: makeId('incident'),
    userId: body?.userId,
    rideId: body?.rideId,
    type: body?.type || 'general',
    details: body?.details,
    createdAt: timestamp()
  };
  store.safetyIncidents.push(report);
  return { module: 'safety', action: 'incident-report', ok: true, report };
}
