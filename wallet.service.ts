export async function balance(body:any, params?:any, query?:any) {
  return {
    module: 'wallet',
    action: 'balance',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function ledger(body:any, params?:any, query?:any) {
  return {
    module: 'wallet',
    action: 'ledger',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function cashout(body:any, params?:any, query?:any) {
  return {
    module: 'wallet',
    action: 'cashout',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
