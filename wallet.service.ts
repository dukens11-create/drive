import { getWalletBalanceCents, pushWalletTx, store } from './data.store';

export async function balance(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'wallet', action: 'balance', error: 'userId is required' };
  return { module: 'wallet', action: 'balance', ok: true, userId, balanceCents: getWalletBalanceCents(userId) };
}

export async function ledger(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'wallet', action: 'ledger', error: 'userId is required' };
  const entries = store.walletTx.filter(tx => tx.userId === userId);
  return { module: 'wallet', action: 'ledger', ok: true, userId, entries };
}

export async function cashout(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const amountCents = Number(body?.amountCents || 0);
  if (!userId || !amountCents || amountCents <= 0) return { module: 'wallet', action: 'cashout', error: 'userId and positive amountCents are required' };

  const balanceCents = getWalletBalanceCents(userId);
  if (balanceCents < amountCents) return { module: 'wallet', action: 'cashout', error: 'insufficient balance' };

  const tx = pushWalletTx(userId, 'debit', amountCents, 'cashout');
  return { module: 'wallet', action: 'cashout', ok: true, tx, balanceCents: getWalletBalanceCents(userId) };
}
