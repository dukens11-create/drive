export async function sos(body:any, params?:any, query?:any) {
  return {
    module: 'safety',
    action: 'sos',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function share_trip(body:any, params?:any, query?:any) {
  return {
    module: 'safety',
    action: 'share-trip',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function incident_report(body:any, params?:any, query?:any) {
  return {
    module: 'safety',
    action: 'incident-report',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
