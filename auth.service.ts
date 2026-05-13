export async function signup(body:any, params?:any, query?:any) {
  return {
    module: 'auth',
    action: 'signup',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function login(body:any, params?:any, query?:any) {
  return {
    module: 'auth',
    action: 'login',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function refresh(body:any, params?:any, query?:any) {
  return {
    module: 'auth',
    action: 'refresh',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
