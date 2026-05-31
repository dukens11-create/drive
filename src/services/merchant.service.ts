import { makeId, store, timestamp } from '../database/data.store';

export async function create_product(body: any, _params?: any, _query?: any) {
  const product = {
    id: makeId('prod'),
    merchantId: body?.merchantId,
    name: body?.name || 'Unnamed Product',
    priceCents: Number(body?.priceCents || 0),
    inStock: body?.inStock !== false,
    createdAt: timestamp()
  };
  store.merchantProducts.set(product.id, product);
  return { module: 'merchant', action: 'create-product', ok: true, product };
}

export async function list_products(body: any, _params?: any, _query?: any) {
  const merchantId = body?.merchantId;
  const products = Array.from(store.merchantProducts.values()).filter(p => !merchantId || p.merchantId === merchantId);
  return { module: 'merchant', action: 'list-products', ok: true, products };
}

export async function orders(body: any, _params?: any, _query?: any) {
  return {
    module: 'merchant',
    action: 'orders',
    ok: true,
    orders: [{ id: makeId('order'), merchantId: body?.merchantId, status: 'pending_fulfillment', createdAt: timestamp() }]
  };
}

export async function payouts(body: any, _params?: any, _query?: any) {
  return {
    module: 'merchant',
    action: 'payouts',
    ok: true,
    payout: {
      merchantId: body?.merchantId,
      amountCents: Number(body?.amountCents || 0),
      status: 'queued',
      at: timestamp()
    }
  };
}
