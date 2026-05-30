import { appendAuditLog, makeId, markStoreDirty, SafetyIncident, store, timestamp } from '../database/data.store';

export async function sos(body: any, _params?: any, _query?: any) {
  const incident: SafetyIncident = {
    id: makeId('sos'),
    userId: body?.userId,
    rideId: body?.rideId,
    type: 'sos',
    lat: body?.lat,
    lng: body?.lng,
    level: body?.level || 'high',
    status: 'open',
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
  const incident: SafetyIncident = {
    id: makeId('incident'),
    userId: body?.userId,
    rideId: body?.rideId,
    type: body?.type || 'general',
    details: body?.details,
    status: 'open',
    createdAt: timestamp()
  };
  store.safetyIncidents.push(incident);
  return { module: 'safety', action: 'incident-report', ok: true, incident };
}

export async function list_incidents(body: any, _params?: any, _query?: any) {
  const status = body?.status;
  const type = body?.type;
  let incidents = [...store.safetyIncidents];
  if (status) incidents = incidents.filter(i => i.status === status);
  if (type) incidents = incidents.filter(i => i.type === type);
  return { module: 'safety', action: 'list-incidents', ok: true, incidents };
}

export async function update_incident(body: any, _params?: any, _query?: any) {
  const incident = store.safetyIncidents.find(i => i.id === body?.incidentId);
  if (!incident) return { module: 'safety', action: 'update-incident', error: 'incident not found' };
  const allowedStatuses = ['open', 'under_review', 'resolved', 'dismissed'] as const;
  if (body?.status && allowedStatuses.includes(body.status)) {
    incident.status = body.status;
    if (body.status === 'resolved' || body.status === 'dismissed') {
      incident.resolvedAt = timestamp();
      const actor = body?.__actor;
      if (actor) incident.resolvedBy = actor.sub || actor.id;
    }
  }
  if (body?.details) incident.details = body.details;
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'incident_updated', incident.id, 'safety_incident', { status: incident.status });
  }
  return { module: 'safety', action: 'update-incident', ok: true, incident };
}
