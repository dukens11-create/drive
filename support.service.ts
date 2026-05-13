export async function create_ticket(body:any, params?:any, query?:any) {
  return {
    module: 'support',
    action: 'create-ticket',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function list_tickets(body:any, params?:any, query?:any) {
  return {
    module: 'support',
    action: 'list-tickets',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}

export async function refund_review(body:any, params?:any, query?:any) {
  return {
    module: 'support',
    action: 'refund-review',
    status: 'TODO_CONNECT_REAL_SERVICE',
    body,
    params,
    query
  };
}
