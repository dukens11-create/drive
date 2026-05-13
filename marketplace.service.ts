import { makeId, store, timestamp } from './data.store';

export async function same_day_dispatch(body: any, _params?: any, _query?: any) {
  const delivery = {
    id: makeId('mktd'),
    orderId: body?.orderId || makeId('order'),
    status: 'assigned' as const,
    etaMinutes: Number(body?.etaMinutes || 45),
    createdAt: timestamp()
  };
  store.marketplaceDeliveries.set(delivery.id, delivery);
  return { module: 'marketplace', action: 'same-day-dispatch', ok: true, delivery };
}

export async function delivery_options(body: any, _params?: any, _query?: any) {
  const distanceMiles = Number(body?.distanceMiles || 5);
  return {
    module: 'marketplace',
    action: 'delivery-options',
    ok: true,
    options: [
      { type: 'same_day', etaMinutes: Math.round(distanceMiles * 8), feeCents: 799 },
      { type: 'express', etaMinutes: Math.round(distanceMiles * 5), feeCents: 1299 }
    ]
  };
}
