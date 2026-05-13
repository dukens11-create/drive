export async function create_session(body:any, params?:any, query?:any) {
  return {
    module: 'kyc',
    action: 'create-session',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function status(body:any, params?:any, query?:any) {
  return {
    module: 'kyc',
    action: 'status',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function webhook(body:any, params?:any, query?:any) {
  return {
    module: 'kyc',
    action: 'webhook',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
