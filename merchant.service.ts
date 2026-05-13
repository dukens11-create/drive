export async function create_product(body:any, params?:any, query?:any) {
  return {
    module: 'merchant',
    action: 'create-product',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function list_products(body:any, params?:any, query?:any) {
  return {
    module: 'merchant',
    action: 'list-products',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function orders(body:any, params?:any, query?:any) {
  return {
    module: 'merchant',
    action: 'orders',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function payouts(body:any, params?:any, query?:any) {
  return {
    module: 'merchant',
    action: 'payouts',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
