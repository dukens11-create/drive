import { getWalletBalanceCents, makeId, markStoreDirty, pushWalletTx, store, timestamp, type BankAccount, type BankAccountType, type PayoutRequest, type PayoutStatus } from '../database/data.store';

const BANK_ACCOUNT_TYPES = new Set<BankAccountType>(['checking', 'savings']);
const MIN_WITHDRAW_CENTS = 100;

function normalizeBankAccountType(value: any): BankAccountType | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase() as BankAccountType;
  return BANK_ACCOUNT_TYPES.has(normalized) ? normalized : undefined;
}

function sanitizeRoutingNumber(value: any): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length === 9 ? digits : undefined;
}

function sanitizeLast4Account(value: any): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return undefined;
  return digits.slice(-4);
}

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

export async function add_bank_account(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const bankName = typeof body?.bankName === 'string' ? body.bankName.trim() : undefined;
  const accountHolderName = typeof body?.accountHolderName === 'string' ? body.accountHolderName.trim() : undefined;
  const accountType = normalizeBankAccountType(body?.accountType);
  const routingNumber = sanitizeRoutingNumber(body?.routingNumber);
  const last4 = sanitizeLast4Account(body?.accountNumber || body?.last4);

  if (!userId) return { module: 'wallet', action: 'add-bank-account', error: 'userId is required' };
  if (!bankName) return { module: 'wallet', action: 'add-bank-account', error: 'bankName is required' };
  if (!accountHolderName) return { module: 'wallet', action: 'add-bank-account', error: 'accountHolderName is required' };
  if (!accountType) return { module: 'wallet', action: 'add-bank-account', error: 'accountType must be checking or savings' };
  if (!routingNumber) return { module: 'wallet', action: 'add-bank-account', error: 'routingNumber must be a valid 9-digit number' };
  if (!last4) return { module: 'wallet', action: 'add-bank-account', error: 'accountNumber (or last4) with at least 4 digits is required' };

  const userAccounts = Array.from(store.bankAccounts.values()).filter(a => a.userId === userId);
  const shouldBeDefault = body?.isDefault === true || userAccounts.length === 0;

  if (shouldBeDefault) {
    for (const acct of userAccounts) {
      acct.isDefault = false;
      acct.updatedAt = timestamp();
    }
  }

  const bankAccount: BankAccount = {
    id: makeId('ba'),
    userId,
    bankName,
    accountHolderName,
    accountType,
    routingNumber,
    last4,
    nickname: typeof body?.nickname === 'string' ? body.nickname.trim() : undefined,
    isDefault: shouldBeDefault,
    stripeExternalAccountId: body?.stripeExternalAccountId,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.bankAccounts.set(bankAccount.id, bankAccount);
  markStoreDirty();

  return { module: 'wallet', action: 'add-bank-account', ok: true, bankAccount };
}

export async function list_bank_accounts(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'wallet', action: 'list-bank-accounts', error: 'userId is required' };

  const accounts = Array.from(store.bankAccounts.values())
    .filter(a => a.userId === userId)
    .sort((a, b) => ((b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)) || b.updatedAt.localeCompare(a.updatedAt));

  return { module: 'wallet', action: 'list-bank-accounts', ok: true, userId, accounts };
}

export async function remove_bank_account(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const bankAccount = store.bankAccounts.get(body?.bankAccountId);
  if (!userId || !bankAccount || bankAccount.userId !== userId) {
    return { module: 'wallet', action: 'remove-bank-account', error: 'bank account not found' };
  }

  const pendingPayout = Array.from(store.payoutRequests.values()).find(
    p => p.bankAccountId === bankAccount.id && (p.status === 'pending' || p.status === 'processing')
  );
  if (pendingPayout) {
    return { module: 'wallet', action: 'remove-bank-account', error: 'cannot remove bank account with a pending payout' };
  }

  const wasDefault = bankAccount.isDefault;
  store.bankAccounts.delete(bankAccount.id);

  if (wasDefault) {
    const replacement = Array.from(store.bankAccounts.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (replacement) {
      replacement.isDefault = true;
      replacement.updatedAt = timestamp();
      store.bankAccounts.set(replacement.id, replacement);
    }
  }
  markStoreDirty();

  return { module: 'wallet', action: 'remove-bank-account', ok: true, bankAccountId: bankAccount.id };
}

export async function set_default_bank_account(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const bankAccount = store.bankAccounts.get(body?.bankAccountId);
  if (!userId || !bankAccount || bankAccount.userId !== userId) {
    return { module: 'wallet', action: 'set-default-bank-account', error: 'bank account not found' };
  }

  for (const acct of store.bankAccounts.values()) {
    if (acct.userId !== userId) continue;
    acct.isDefault = acct.id === bankAccount.id;
    acct.updatedAt = timestamp();
  }
  markStoreDirty();

  return { module: 'wallet', action: 'set-default-bank-account', ok: true, bankAccount };
}

export async function withdraw(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  const amountCents = Number(body?.amountCents || 0);
  if (!userId) return { module: 'wallet', action: 'withdraw', error: 'userId is required' };
  if (!amountCents || amountCents < MIN_WITHDRAW_CENTS) {
    return { module: 'wallet', action: 'withdraw', error: `minimum withdrawal is $${(MIN_WITHDRAW_CENTS / 100).toFixed(2)}` };
  }

  let bankAccount: BankAccount | undefined;
  if (body?.bankAccountId) {
    bankAccount = store.bankAccounts.get(body.bankAccountId);
    if (!bankAccount || bankAccount.userId !== userId) {
      return { module: 'wallet', action: 'withdraw', error: 'bank account not found' };
    }
  } else {
    bankAccount = Array.from(store.bankAccounts.values()).find(a => a.userId === userId && a.isDefault);
    if (!bankAccount) {
      return { module: 'wallet', action: 'withdraw', error: 'no default bank account on file; add a bank account first' };
    }
  }

  const balanceCents = getWalletBalanceCents(userId);
  if (balanceCents < amountCents) return { module: 'wallet', action: 'withdraw', error: 'insufficient balance' };

  const tx = pushWalletTx(userId, 'debit', amountCents, `payout:withdraw`);

  const payout: PayoutRequest = {
    id: makeId('po'),
    userId,
    bankAccountId: bankAccount.id,
    amountCents,
    currency: body?.currency || 'USD',
    status: 'pending' as PayoutStatus,
    walletTxId: tx.id,
    stripePayoutId: body?.stripePayoutId || makeId('stripe_po'),
    scheduledAt: body?.scheduledAt,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.payoutRequests.set(payout.id, payout);
  markStoreDirty();

  return {
    module: 'wallet',
    action: 'withdraw',
    ok: true,
    payout,
    tx,
    balanceCents: getWalletBalanceCents(userId)
  };
}

export async function payout_history(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'wallet', action: 'payout-history', error: 'userId is required' };

  const payouts = Array.from(store.payoutRequests.values())
    .filter(p => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { module: 'wallet', action: 'payout-history', ok: true, userId, payouts };
}

export async function weekly_summary(body: any, _params?: any, _query?: any) {
  const userId = body?.userId;
  if (!userId) return { module: 'wallet', action: 'weekly-summary', error: 'userId is required' };

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const weekStart = startOfWeek.toISOString();

  const weeklyTx = store.walletTx.filter(tx => tx.userId === userId && tx.createdAt >= weekStart);
  const grossEarningsCents = weeklyTx.filter(tx => tx.kind === 'credit').reduce((sum, tx) => sum + tx.amountCents, 0);
  const debitsCents = weeklyTx.filter(tx => tx.kind === 'debit').reduce((sum, tx) => sum + tx.amountCents, 0);
  const netEarningsCents = grossEarningsCents - debitsCents;

  const payoutTx = weeklyTx.filter(tx => tx.kind === 'debit' && tx.reason.startsWith('payout:'));
  const withdrawnCents = payoutTx.reduce((sum, tx) => sum + tx.amountCents, 0);

  const tripTx = weeklyTx.filter(tx => tx.kind === 'credit' && tx.reason.startsWith('payment:') && tx.reason.endsWith(':driver_payout'));
  const tripsCount = tripTx.length;

  const avgPerTripCents = tripsCount > 0 ? Math.round(grossEarningsCents / tripsCount) : 0;

  const pendingPayouts = Array.from(store.payoutRequests.values()).filter(
    p => p.userId === userId && (p.status === 'pending' || p.status === 'processing')
  );
  const pendingPayoutCents = pendingPayouts.reduce((sum, p) => sum + p.amountCents, 0);

  return {
    module: 'wallet',
    action: 'weekly-summary',
    ok: true,
    userId,
    weekStart,
    grossEarningsCents,
    debitsCents,
    netEarningsCents,
    withdrawnCents,
    pendingPayoutCents,
    tripsCount,
    avgPerTripCents,
    balanceCents: getWalletBalanceCents(userId)
  };
}
