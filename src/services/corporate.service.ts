import {
  getCorporateAccountForEmployee,
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type CorporateAccount,
  type CorporateRideTag
} from '../database/data.store';

function getUserId(body: any) {
  return body?.actor?.id || body?.userId;
}

export async function createCorporateAccount(body: any) {
  const adminUserId = getUserId(body);
  const companyName = body?.companyName;
  const billingEmail = body?.billingEmail;
  if (!companyName || !billingEmail) {
    return { module: 'corporate', action: 'create', error: 'companyName and billingEmail required' };
  }

  const account: CorporateAccount = {
    id: makeId('corp'),
    companyName,
    billingEmail,
    adminUserId: adminUserId || '',
    status: 'active',
    creditLimitCents: Number(body?.creditLimitCents || 100000),
    usedCreditCents: 0,
    invoiceCycleDays: Number(body?.invoiceCycleDays || 30),
    allowedEmployeeIds: Array.isArray(body?.allowedEmployeeIds) ? body.allowedEmployeeIds : [],
    createdAt: timestamp(),
    updatedAt: timestamp()
  };

  store.corporateAccounts.set(account.id, account);
  markStoreDirty();
  return { module: 'corporate', action: 'create', ok: true, account };
}

export async function getCorporateAccount(body: any, params?: any) {
  const accountId = params?.id || body?.accountId;
  if (!accountId) return { module: 'corporate', action: 'get', error: 'accountId required' };
  const account = store.corporateAccounts.get(accountId);
  if (!account) return { module: 'corporate', action: 'get', error: 'account not found' };
  return { module: 'corporate', ok: true, account };
}

export async function listCorporateAccounts() {
  const accounts = Array.from(store.corporateAccounts.values());
  return { module: 'corporate', ok: true, total: accounts.length, accounts };
}

export async function addEmployee(body: any, params?: any) {
  const accountId = params?.id || body?.accountId;
  const employeeId = body?.employeeId;
  if (!accountId || !employeeId) {
    return { module: 'corporate', action: 'add-employee', error: 'accountId and employeeId required' };
  }

  const account = store.corporateAccounts.get(accountId);
  if (!account) return { module: 'corporate', action: 'add-employee', error: 'account not found' };

  if (!account.allowedEmployeeIds.includes(employeeId)) {
    account.allowedEmployeeIds.push(employeeId);
    account.updatedAt = timestamp();
    store.corporateAccounts.set(accountId, account);
    markStoreDirty();
  }

  return { module: 'corporate', action: 'add-employee', ok: true, account };
}

export async function removeEmployee(body: any, params?: any) {
  const accountId = params?.id || body?.accountId;
  const employeeId = body?.employeeId;
  if (!accountId || !employeeId) {
    return { module: 'corporate', action: 'remove-employee', error: 'accountId and employeeId required' };
  }

  const account = store.corporateAccounts.get(accountId);
  if (!account) return { module: 'corporate', action: 'remove-employee', error: 'account not found' };

  account.allowedEmployeeIds = account.allowedEmployeeIds.filter(id => id !== employeeId);
  account.updatedAt = timestamp();
  store.corporateAccounts.set(accountId, account);
  markStoreDirty();

  return { module: 'corporate', action: 'remove-employee', ok: true, account };
}

export async function tagRideAsCorporate(body: any) {
  const rideId = body?.rideId;
  const employeeId = body?.employeeId || body?.userId;
  if (!rideId || !employeeId) {
    return { module: 'corporate', action: 'tag-ride', error: 'rideId and employeeId required' };
  }

  const ride = store.rides.get(rideId);
  if (!ride) return { module: 'corporate', action: 'tag-ride', error: 'ride not found' };

  const account = getCorporateAccountForEmployee(employeeId);
  if (!account) return { module: 'corporate', action: 'tag-ride', error: 'no corporate account for this employee' };

  // ride.fareEstimate is stored in dollars; convert to cents for billing
  const billableCents = Math.round((ride.fareEstimate || 0) * 100);
  if (account.usedCreditCents + billableCents > account.creditLimitCents) {
    return { module: 'corporate', action: 'tag-ride', error: 'corporate credit limit exceeded' };
  }

  const tag: CorporateRideTag = {
    rideId,
    corporateAccountId: account.id,
    employeeId,
    billableCents,
    invoiced: false,
    createdAt: timestamp()
  };

  store.corporateRideTags.push(tag);
  account.usedCreditCents += billableCents;
  account.updatedAt = timestamp();
  store.corporateAccounts.set(account.id, account);
  markStoreDirty();

  return { module: 'corporate', action: 'tag-ride', ok: true, tag, account };
}

export async function getCorporateInvoice(body: any, params?: any) {
  const accountId = params?.id || body?.accountId;
  if (!accountId) return { module: 'corporate', action: 'invoice', error: 'accountId required' };

  const account = store.corporateAccounts.get(accountId);
  if (!account) return { module: 'corporate', action: 'invoice', error: 'account not found' };

  const tags = store.corporateRideTags.filter(t => t.corporateAccountId === accountId && !t.invoiced);
  const totalCents = tags.reduce((sum, t) => sum + t.billableCents, 0);

  return {
    module: 'corporate',
    action: 'invoice',
    ok: true,
    account,
    uninvoicedRides: tags.length,
    totalDueCents: totalCents,
    rides: tags
  };
}
