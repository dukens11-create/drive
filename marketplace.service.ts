export async function same_day_dispatch(body:any, params?:any, query?:any) {
  return {
    module: 'marketplace',
    action: 'same-day-dispatch',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function delivery_options(body:any, params?:any, query?:any) {
  return {
    module: 'marketplace',
    action: 'delivery-options',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
