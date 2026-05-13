export async function create_intent(body:any, params?:any, query?:any) {
  return {
    module: 'payments',
    action: 'create-intent',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function capture(body:any, params?:any, query?:any) {
  return {
    module: 'payments',
    action: 'capture',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function refund(body:any, params?:any, query?:any) {
  return {
    module: 'payments',
    action: 'refund',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function stripe_webhook(body:any, params?:any, query?:any) {
  return {
    module: 'payments',
    action: 'stripe-webhook',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
