export async function drivers_pending(body:any, params?:any, query?:any) {
  return {
    module: 'admin',
    action: 'drivers-pending',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function approve_driver(body:any, params?:any, query?:any) {
  return {
    module: 'admin',
    action: 'approve-driver',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function live_rides(body:any, params?:any, query?:any) {
  return {
    module: 'admin',
    action: 'live-rides',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function risk_alerts(body:any, params?:any, query?:any) {
  return {
    module: 'admin',
    action: 'risk-alerts',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function refunds(body:any, params?:any, query?:any) {
  return {
    module: 'admin',
    action: 'refunds',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
