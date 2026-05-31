import { createHash, randomBytes } from 'crypto';
import * as authService from './auth.service';
import * as restaurantsService from './restaurants.service';
import {
  appendAuditLog,
  getActiveSurgeMultiplier,
  getWalletBalanceCents,
  listUsersByRole,
  makeId,
  markStoreDirty,
  store,
  timestamp,
  type AdminBulkJob,
  type AdminExportJob,
  type AdminImportChange,
  type AdminImportJob,
  type AdminApiKey,
  type MarketConfig,
  type PlatformFeatureFlag,
  type PlatformSettings,
  type Promo,
  type User
} from '../database/data.store';

type SafeUser = Omit<User, 'password'> & { suspended?: boolean };
const MS_PER_HOUR = 3_600_000;
const API_KEY_RANDOM_BYTES = 18;

function sanitizeUser(user: (User & { suspended?: boolean }) | undefined): SafeUser | undefined {
  if (!user) return undefined;
  const { password, ...safe } = user;
  return safe;
}

function sanitizeApiKey(apiKey: AdminApiKey) {
  const { keyHash, ...safe } = apiKey;
  return safe;
}

function safeNumber(rawValue: unknown, fallback = 0) {
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function optionalNumber(value: any) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function dayKey(value?: string) {
  if (!value) return 'unknown';
  return value.slice(0, 10);
}

function monthKey(value?: string) {
  if (!value) return 'unknown';
  return value.slice(0, 7);
}

function weekKey(value?: string) {
  if (!value) return 'unknown';
  const date = new Date(value);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function aggregateSeries<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  getValue: (item: T) => number,
  bucket: 'day' | 'week' | 'month',
  limit = 8
) {
  const map = new Map<string, number>();
  const keyFor = bucket === 'month' ? monthKey : bucket === 'week' ? weekKey : dayKey;
  for (const item of items) {
    const key = keyFor(getDate(item));
    map.set(key, (map.get(key) || 0) + getValue(item));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([label, value]) => ({ label, value }));
}

function getSettings() {
  return store.platformSettings.get('global') || {
    maintenanceMode: false,
    appVersion: '1.0.0',
    commissionRatePercent: 20,
    surgeMultiplier: getActiveSurgeMultiplier(),
    featureFlags: [],
    updatedAt: timestamp()
  };
}

function isFeatureFlag(value: unknown): value is Partial<PlatformFeatureFlag> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeFeatureFlags(flags: unknown, fallback: PlatformFeatureFlag[]) {
  if (!Array.isArray(flags)) return fallback;
  return flags
    .filter(isFeatureFlag)
    .map(flag => ({
      key: String(flag.key || '').trim(),
      label: String(flag.label || flag.key || '').trim(),
      enabled: Boolean(flag.enabled)
    }))
    .filter(flag => flag.key && flag.label);
}

const ADMIN_HISTORY_LIMIT = 25;

type AdminActor = { sub?: string; id?: string; role?: string };

function trimHistory<T>(items: T[]) {
  if (items.length > ADMIN_HISTORY_LIMIT) items.splice(ADMIN_HISTORY_LIMIT);
}

function rememberExportJob(job: AdminExportJob) {
  store.adminExportJobs.unshift(job);
  trimHistory(store.adminExportJobs);
}

function rememberImportJob(job: AdminImportJob) {
  store.adminImportJobs.unshift(job);
  trimHistory(store.adminImportJobs);
}

function rememberBulkJob(job: AdminBulkJob) {
  store.adminBulkJobs.unshift(job);
  trimHistory(store.adminBulkJobs);
}

function actorId(actor?: AdminActor) {
  return actor?.sub || actor?.id;
}

function actorRole(actor?: AdminActor) {
  return actor?.role || 'admin';
}

function escapeCsvValue(value: unknown) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return /[",\n]/.test(raw) ? `"${escaped}"` : escaped;
}

function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.map(escapeCsvValue).join(','), ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(','))].join('\n');
}

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rowsToXml(dataType: string, rows: Array<Record<string, unknown>>) {
  const singular = dataType.replace(/s$/, '') || 'item';
  return `<export type="${escapeXml(dataType)}">${rows.map(row => `<${singular}>${Object.entries(row).map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`).join('')}</${singular}>`).join('')}</export>`;
}

function rowsToSpreadsheetBase64(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return Buffer.from('', 'utf8').toString('base64');
  const headers = Object.keys(rows[0]);
  if (!headers.length) return Buffer.from('', 'utf8').toString('base64');
  const content = [headers.join('\t'), ...rows.map(row => headers.map(header => String(row[header] ?? '')).join('\t'))].join('\n');
  return Buffer.from(content, 'utf8').toString('base64');
}

function normalizeCell(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
}

function parseCsv(content: string) {
  if (!content.trim()) return [] as Array<Record<string, unknown>>;
  const lines = content.trim().split(/\r?\n/);
  if (!lines.length) return [] as Array<Record<string, unknown>>;
  const parseLine = (line: string, delimiter: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let charIndex = 0; charIndex < line.length; charIndex += 1) {
      const currentChar = line[charIndex];
      if (currentChar === '"') {
        if (inQuotes && line[charIndex + 1] === '"') {
          current += '"';
          charIndex += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (currentChar === delimiter && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += currentChar;
      }
    }
    values.push(current);
    return values;
  };
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = parseLine(lines[0], delimiter);
  return lines.slice(1).filter(Boolean).map(line => {
    const values = parseLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function parseImportRecords(body: any) {
  if (Array.isArray(body?.records)) return body.records as Array<Record<string, unknown>>;
  const format = String(body?.format || 'json').toLowerCase();
  if (format === 'api' && body?.payload) {
    return Array.isArray(body.payload) ? body.payload : [body.payload];
  }
  if (format === 'xlsx') {
    return parseCsv(Buffer.from(String(body?.content || ''), 'base64').toString('utf8'));
  }
  const content = String(body?.content || '');
  if (!content.trim()) return [];
  if (format === 'csv') return parseCsv(content);
  if (format === 'json') {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    return parsed?.records && Array.isArray(parsed.records) ? parsed.records : [parsed];
  }
  return [];
}

async function getRestaurantAdminSnapshot() {
  const response = await restaurantsService.adminListRestaurants() as any;
  const restaurants = Array.isArray(response?.restaurants) ? response.restaurants : [];
  const flatRestaurants = restaurants.map((restaurant: any) => ({
    id: restaurant.id,
    userId: restaurant.userId,
    email: restaurant.email,
    name: restaurant.name,
    city: restaurant.city || '',
    cuisine: restaurant.cuisine || '',
    verificationStatus: restaurant.verificationStatus,
    complianceStatus: restaurant.complianceStatus,
    commissionRatePercent: restaurant.commissionRatePercent,
    createdAt: restaurant.createdAt,
    updatedAt: restaurant.updatedAt
  }));
  const orders = restaurants.flatMap((restaurant: any) =>
    Array.from(restaurant.orders?.values?.() || []).map((order: any) => ({
      id: order.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      userId: order.userId,
      status: order.status,
      amountCents: order.amountCents,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }))
  );
  const reviews = restaurants.flatMap((restaurant: any) =>
    Array.from(restaurant.reviews?.values?.() || []).map((review: any) => ({
      id: review.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      userId: review.userId || '',
      rating: review.rating,
      comment: review.comment || '',
      response: review.response || '',
      createdAt: review.createdAt
    }))
  );
  return { restaurants: flatRestaurants, orders, reviews };
}

function getRowDate(row: Record<string, unknown>) {
  const raw = row.updatedAt || row.createdAt || row.capturedAt || row.refundedAt || row.resolvedAt || row.launchedAt;
  if (typeof raw !== 'string' || !raw) return undefined;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : undefined;
}

function applyDatasetFilters(rows: Array<Record<string, unknown>>, filters: Record<string, unknown> | undefined, dateFrom?: string, dateTo?: string) {
  const search = typeof filters?.search === 'string' ? filters.search.trim().toLowerCase() : '';
  const otherFilters = Object.entries(filters || {}).filter(([key, value]) => key !== 'search' && value !== undefined && value !== null && String(value).trim() !== '');
  const from = dateFrom ? new Date(dateFrom).getTime() : undefined;
  const to = dateTo ? new Date(dateTo).getTime() : undefined;
  return rows.filter(row => {
    if (search) {
      const haystack = Object.values(row).map(value => String(value ?? '').toLowerCase()).join(' ');
      if (!haystack.includes(search)) return false;
    }
    for (const [key, expected] of otherFilters) {
      if (!String(row[key] ?? '').toLowerCase().includes(String(expected).toLowerCase())) return false;
    }
    if (from !== undefined || to !== undefined) {
      const rowDate = getRowDate(row);
      if (rowDate === undefined) return false;
      if (from !== undefined && rowDate < from) return false;
      if (to !== undefined && rowDate > to) return false;
    }
    return true;
  });
}

function selectColumns(rows: Array<Record<string, unknown>>, columns?: unknown) {
  if (!Array.isArray(columns) || !columns.length) return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeCell(value)])));
  const normalized = columns.map(column => String(column)).filter(Boolean);
  if (!normalized.length) return rows;
  return rows.map(row => Object.fromEntries(normalized.map(column => [column, normalizeCell(row[column])])));
}

async function buildExportDataset(dataType: string) {
  const users = Array.from(store.users.values()).map(sanitizeUser);
  const usersById = new Map(users.map(user => [user.id, user]));
  const rides = Array.from(store.rides.values()).map(ride => ({ ...ride }));
  const payments = Array.from(store.payments.values()).map(payment => ({ ...payment }));
  const drivers = Array.from(store.drivers.values()).map(driver => ({
    ...driver,
    userEmail: usersById.get(driver.userId)?.email || '',
    walletBalanceCents: getWalletBalanceCents(driver.userId)
  }));
  const tickets = Array.from(store.tickets.values()).map(ticket => ({ ...ticket, userEmail: usersById.get(ticket.userId)?.email || '' }));
  const incidents = store.safetyIncidents.map(incident => ({ ...incident, userEmail: incident.userId ? usersById.get(incident.userId)?.email || '' : '' }));
  const { restaurants, orders, reviews } = await getRestaurantAdminSnapshot();
  const datasets: Record<string, Array<Record<string, unknown>>> = {
    users: users.map(user => ({ ...user })),
    rides,
    orders,
    transactions: payments,
    payments,
    restaurants,
    drivers,
    tickets,
    reviews,
    incidents,
    promos: Array.from(store.promos.values()).map(promo => ({ ...promo })),
    markets: Array.from(store.markets.values()).map(market => ({ ...market }))
  };
  return datasets[dataType] || [];
}

async function createExportJob(body: any, actor?: AdminActor) {
  const reuse = body?.reuseJobId ? store.adminExportJobs.find(job => job.id === body.reuseJobId) : undefined;
  const dataType = String(body?.dataType || reuse?.dataType || 'users');
  const format = String(body?.format || reuse?.format || 'csv').toLowerCase();
  const filters = (body?.filters || reuse?.filters || {}) as Record<string, unknown>;
  const dateFrom = body?.dateFrom || undefined;
  const dateTo = body?.dateTo || undefined;
  const requestedColumns = body?.columns || reuse?.columns || [];
  const filtered = selectColumns(
    applyDatasetFilters(await buildExportDataset(dataType), filters, dateFrom, dateTo),
    requestedColumns
  );
  const job: AdminExportJob = {
    id: makeId('export'),
    dataType,
    format,
    filename: `${dataType}-${Date.now()}.${format}`,
    rowCount: filtered.length,
    columns: Array.isArray(requestedColumns) ? requestedColumns.map((column: unknown) => String(column)) : [],
    filters,
    requestedAt: timestamp(),
    requestedBy: actorId(actor),
    reusedFromId: reuse?.id
  };
  rememberExportJob(job);
  const auditActorId = actorId(actor);
  if (auditActorId) {
    appendAuditLog(auditActorId, actorRole(actor), 'admin_export_created', job.id, 'admin_export', { dataType, format, rowCount: filtered.length });
  }
  const content = format === 'json'
    ? JSON.stringify(filtered, null, 2)
    : format === 'xml'
      ? rowsToXml(dataType, filtered)
      : format === 'xlsx'
        ? rowsToSpreadsheetBase64(filtered)
        : rowsToCsv(filtered);
  return {
    module: 'admin',
    action: 'export-data',
    ok: true,
    export: {
      ...job,
      content,
      contentType: format === 'json'
        ? 'application/json'
        : format === 'xml'
          ? 'application/xml'
          : format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv'
    }
  };
}

function cloneValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function previewImport(dataType: string, format: string, records: Array<Record<string, unknown>>, actor?: AdminActor) {
  const errors: string[] = [];
  let duplicateCount = 0;
  let validRecords = 0;
  if (dataType === 'users') {
    records.forEach((record, index) => {
      const email = String(record.email || '').trim().toLowerCase();
      const phone = String(record.phone || '').trim();
      const password = String(record.password || '').trim();
      if (!email && !phone) {
        errors.push(`Row ${index + 1}: email or phone is required`);
        return;
      }
      if (!password) {
        errors.push(`Row ${index + 1}: password is required for imported users`);
        return;
      }
      validRecords += 1;
      if (Array.from(store.users.values()).some(user => (email && user.email === email) || (phone && user.phone === phone))) duplicateCount += 1;
    });
  } else if (dataType === 'promos') {
    records.forEach((record, index) => {
      const code = String(record.code || '').trim().toUpperCase();
      if (!code) {
        errors.push(`Row ${index + 1}: promo code is required`);
        return;
      }
      validRecords += 1;
      if (store.promos.has(code)) duplicateCount += 1;
    });
  } else if (dataType === 'markets') {
    records.forEach((record, index) => {
      const name = String(record.name || '').trim();
      const city = String(record.city || '').trim();
      const country = String(record.country || '').trim();
      if (!name || !city || !country) {
        errors.push(`Row ${index + 1}: name, city, and country are required`);
        return;
      }
      validRecords += 1;
      if (Array.from(store.markets.values()).some(market => market.name === name && market.city === city)) duplicateCount += 1;
    });
  } else if (dataType === 'settings') {
    validRecords = records.length ? 1 : 0;
    if (!records.length) errors.push('At least one settings record is required');
    duplicateCount = store.platformSettings.get('global') ? 1 : 0;
  } else {
    errors.push(`Unsupported import data type: ${dataType}`);
  }
  const job: AdminImportJob = {
    id: makeId('import'),
    dataType,
    format,
    status: 'preview',
    totalRecords: records.length,
    validRecords,
    importedCount: 0,
    duplicateCount,
    errorCount: errors.length,
    requestedAt: timestamp(),
    requestedBy: actorId(actor),
    errors,
    changes: []
  };
  rememberImportJob(job);
  return { module: 'admin', action: 'import-data', ok: true, preview: job };
}

async function applyImport(dataType: string, format: string, records: Array<Record<string, unknown>>, actor?: AdminActor) {
  const errors: string[] = [];
  const changes: AdminImportChange[] = [];
  let duplicateCount = 0;
  let validRecords = 0;
  let importedCount = 0;

  if (dataType === 'users') {
    for (const [index, record] of records.entries()) {
      const email = String(record.email || '').trim().toLowerCase();
      const phone = String(record.phone || '').trim();
      const password = String(record.password || '').trim();
      const role = ['driver', 'merchant', 'rider'].includes(String(record.role || '').trim()) ? String(record.role).trim() : 'rider';
      if (!email && !phone) {
        errors.push(`Row ${index + 1}: email or phone is required`);
        continue;
      }
      if (!password) {
        errors.push(`Row ${index + 1}: password is required for imported users`);
        continue;
      }
      validRecords += 1;
      const existing = Array.from(store.users.values()).find(user => (email && user.email === email) || (phone && user.phone === phone));
      if (existing) {
        duplicateCount += 1;
        continue;
      }
      const created = await authService.signup({ email: email || undefined, phone: phone || undefined, password, role });
      if ((created as any).error) {
        errors.push(`Row ${index + 1}: ${(created as any).error}`);
        continue;
      }
      importedCount += 1;
      changes.push({ key: (created as any).user.id, action: 'created' });
    }
  } else if (dataType === 'promos') {
    for (const [index, record] of records.entries()) {
      const code = String(record.code || '').trim().toUpperCase();
      if (!code) {
        errors.push(`Row ${index + 1}: promo code is required`);
        continue;
      }
      validRecords += 1;
      const existing = store.promos.get(code);
      if (existing) duplicateCount += 1;
      const promo: Promo = {
        id: existing?.id || makeId('promo'),
        code,
        discountType: String(record.discountType || existing?.discountType || 'flat') === 'percent' ? 'percent' : 'flat',
        discountValue: Math.max(0, safeNumber(record.discountValue, existing?.discountValue || 0)),
        active: record.active === undefined ? existing?.active !== false : Boolean(record.active),
        minFareCents: optionalNumber(record.minFareCents) ?? existing?.minFareCents,
        maxUsages: optionalNumber(record.maxUsages) ?? existing?.maxUsages,
        usageCount: existing?.usageCount || 0,
        expiresAt: typeof record.expiresAt === 'string' && record.expiresAt ? record.expiresAt : existing?.expiresAt,
        createdAt: existing?.createdAt || timestamp()
      };
      store.promos.set(code, promo);
      importedCount += 1;
      changes.push({ key: code, action: existing ? 'updated' : 'created', previousValue: cloneValue(existing) });
    }
  } else if (dataType === 'markets') {
    for (const [index, record] of records.entries()) {
      const marketId = String(record.id || '').trim();
      const name = String(record.name || '').trim();
      const city = String(record.city || '').trim();
      const country = String(record.country || '').trim();
      if (!name || !city || !country) {
        errors.push(`Row ${index + 1}: name, city, and country are required`);
        continue;
      }
      validRecords += 1;
      const existing = marketId ? store.markets.get(marketId) : Array.from(store.markets.values()).find(market => market.name === name && market.city === city);
      if (existing) duplicateCount += 1;
      const market: MarketConfig = {
        id: existing?.id || makeId('market'),
        name,
        city,
        country,
        status: ['pre_launch', 'active', 'paused', 'sunset'].includes(String(record.status || existing?.status || 'pre_launch')) ? String(record.status || existing?.status || 'pre_launch') as MarketConfig['status'] : 'pre_launch',
        launchedAt: typeof record.launchedAt === 'string' && record.launchedAt ? record.launchedAt : existing?.launchedAt,
        createdAt: existing?.createdAt || timestamp(),
        updatedAt: timestamp()
      };
      store.markets.set(market.id, market);
      importedCount += 1;
      changes.push({ key: market.id, action: existing ? 'updated' : 'created', previousValue: cloneValue(existing) });
    }
  } else if (dataType === 'settings') {
    const current = cloneValue(getSettings());
    const record = records[0] || {};
    validRecords = records.length ? 1 : 0;
    if (!records.length) {
      errors.push('At least one settings record is required');
    } else {
      const settings: PlatformSettings = {
        maintenanceMode: typeof record.maintenanceMode === 'boolean' ? record.maintenanceMode : current.maintenanceMode,
        appVersion: typeof record.appVersion === 'string' && record.appVersion.trim() ? record.appVersion.trim() : current.appVersion,
        commissionRatePercent: safeNumber(record.commissionRatePercent, current.commissionRatePercent),
        surgeMultiplier: safeNumber(record.surgeMultiplier, current.surgeMultiplier),
        featureFlags: normalizeFeatureFlags(record.featureFlags, current.featureFlags),
        updatedAt: timestamp()
      };
      store.platformSettings.set('global', settings);
      store.surgeConfig.set('global', { multiplier: settings.surgeMultiplier, reason: 'admin_import', updatedAt: settings.updatedAt });
      importedCount = 1;
      changes.push({ key: 'global', action: 'updated', previousValue: current });
    }
  } else {
    errors.push(`Unsupported import data type: ${dataType}`);
  }

  const job: AdminImportJob = {
    id: makeId('import'),
    dataType,
    format,
    status: 'completed',
    totalRecords: records.length,
    validRecords,
    importedCount,
    duplicateCount,
    errorCount: errors.length,
    requestedAt: timestamp(),
    requestedBy: actorId(actor),
    errors,
    changes
  };
  rememberImportJob(job);
  if (actorId(actor)) {
    appendAuditLog(actorId(actor)!, actorRole(actor), 'admin_import_completed', job.id, 'admin_import', { dataType, importedCount, duplicateCount, errorCount: errors.length });
  }
  return { module: 'admin', action: 'import-data', ok: true, importJob: job };
}

function rollbackImportJob(jobId: string, actor?: AdminActor) {
  const job = store.adminImportJobs.find(item => item.id === jobId);
  if (!job) return { module: 'admin', action: 'rollback-import', error: 'import job not found' };
  if (job.status === 'rolled_back') return { module: 'admin', action: 'rollback-import', error: 'import job already rolled back' };
  for (const change of [...job.changes].reverse()) {
    if (job.dataType === 'users') {
      if (change.action === 'created') store.users.delete(change.key);
    } else if (job.dataType === 'promos') {
      if (change.action === 'created') store.promos.delete(change.key);
      else if (change.previousValue) store.promos.set(change.key, change.previousValue as Promo);
    } else if (job.dataType === 'markets') {
      if (change.action === 'created') store.markets.delete(change.key);
      else if (change.previousValue) store.markets.set(change.key, change.previousValue as MarketConfig);
    } else if (job.dataType === 'settings' && change.previousValue) {
      const previous = change.previousValue as PlatformSettings;
      store.platformSettings.set('global', previous);
      store.surgeConfig.set('global', { multiplier: previous.surgeMultiplier, reason: 'admin_import_rollback', updatedAt: timestamp() });
    }
  }
  job.status = 'rolled_back';
  job.rollbackAt = timestamp();
  if (actorId(actor)) {
    appendAuditLog(actorId(actor)!, actorRole(actor), 'admin_import_rolled_back', job.id, 'admin_import', { dataType: job.dataType });
  }
  return { module: 'admin', action: 'rollback-import', ok: true, importJob: job };
}

async function runBulkOperationInternal(body: any, actor?: AdminActor) {
  const targetType = String(body?.targetType || 'users');
  const action = String(body?.action || 'suspend');
  let ids = Array.isArray(body?.ids) ? body.ids.map((id: unknown) => String(id)) : [];
  const errors: string[] = [];
  let succeeded = 0;

  if (!ids.length && body?.filters) {
    const dataset = await buildExportDataset(targetType);
    ids = applyDatasetFilters(dataset, body.filters, undefined, undefined)
      .map(row => String(row.id || row.userId || row.code || ''))
      .filter(Boolean);
  }

  for (const id of ids) {
    if (targetType === 'users') {
      const result = await suspend_user({ userId: id, suspend: action !== 'activate', __actor: actor });
      if ((result as any).error) errors.push(`${id}: ${(result as any).error}`); else succeeded += 1;
    } else if (targetType === 'drivers') {
      const result = action === 'suspend'
        ? await suspend_user({ userId: id, suspend: true, __actor: actor })
        : await approve_driver({ userId: id, approved: action !== 'reject', __actor: actor });
      if ((result as any).error) errors.push(`${id}: ${(result as any).error}`); else succeeded += 1;
    } else if (targetType === 'promos') {
      const promo = store.promos.get(id) || Array.from(store.promos.values()).find(item => item.id === id);
      if (!promo) {
        errors.push(`${id}: promo not found`);
        continue;
      }
      promo.active = action === 'activate';
      if (action === 'update_discount') promo.discountValue = Math.max(0, safeNumber(body?.payload?.discountValue, promo.discountValue));
      store.promos.set(promo.code, promo);
      succeeded += 1;
    } else if (targetType === 'markets') {
      const market = store.markets.get(id);
      if (!market) {
        errors.push(`${id}: market not found`);
        continue;
      }
      market.status = action === 'activate' ? 'active' : action === 'pause' ? 'paused' : market.status;
      market.updatedAt = timestamp();
      store.markets.set(market.id, market);
      succeeded += 1;
    } else if (targetType === 'restaurants') {
      const result = action === 'suspend'
        ? await restaurantsService.adminSuspendRestaurant(id)
        : action === 'approve'
          ? await restaurantsService.adminApproveRestaurant(id)
          : await restaurantsService.adminUpdateCommission(id, { commissionRatePercent: safeNumber(body?.payload?.commissionRatePercent, 20) });
      if ((result as any).error) errors.push(`${id}: ${(result as any).error}`); else succeeded += 1;
    } else if (targetType === 'tickets') {
      const result = await update_ticket({ ticketId: id, status: action === 'close' ? 'closed' : 'in_review', resolution: String(body?.payload?.resolution || 'Updated in bulk'), __actor: actor });
      if ((result as any).error) errors.push(`${id}: ${(result as any).error}`); else succeeded += 1;
    } else {
      errors.push(`${id}: unsupported bulk target ${targetType}`);
    }
  }

  const job: AdminBulkJob = {
    id: makeId('bulk'),
    targetType,
    action,
    total: ids.length,
    processed: ids.length,
    succeeded,
    failed: errors.length,
    requestedAt: timestamp(),
    requestedBy: actorId(actor),
    errors,
    status: 'completed'
  };
  rememberBulkJob(job);
  if (actorId(actor)) {
    appendAuditLog(actorId(actor)!, actorRole(actor), 'admin_bulk_completed', job.id, 'admin_bulk', { targetType, action, total: ids.length, failed: errors.length });
  }
  return { module: 'admin', action: 'bulk-operation', ok: true, job };
}

export async function drivers_pending(_body: any, _params?: any, _query?: any) {
  const pending = Array.from(store.drivers.values()).filter(d => d.status === 'pending');
  return { module: 'admin', action: 'drivers-pending', ok: true, pending };
}

export async function approve_driver(body: any, _params?: any, _query?: any) {
  const profile = store.drivers.get(body?.userId);
  if (!profile) return { module: 'admin', action: 'approve-driver', error: 'driver profile not found' };
  const newStatus = body?.approved === false ? 'rejected' : 'approved';
  profile.status = newStatus;
  if (newStatus === 'rejected') {
    profile.verificationState = 'rejected';
    profile.availabilityStatus = 'unavailable';
    profile.available = false;
  } else {
    profile.verificationState = 'verified';
    if (!profile.availabilityStatus || profile.availabilityStatus === 'unavailable') profile.availabilityStatus = 'offline';
    profile.available = profile.availabilityStatus === 'online';
  }
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, `driver_${newStatus}`, body.userId, 'driver', { approved: body?.approved });
  }
  return { module: 'admin', action: 'approve-driver', ok: true, profile };
}

export async function live_rides(_body: any, _params?: any, _query?: any) {
  const live = Array.from(store.rides.values()).filter(r => r.status === 'requested' || r.status === 'accepted' || r.status === 'started');
  return { module: 'admin', action: 'live-rides', ok: true, live };
}

export async function risk_alerts(_body: any, _params?: any, _query?: any) {
  const alerts = store.safetyIncidents.slice(-50);
  return { module: 'admin', action: 'risk-alerts', ok: true, alerts };
}

export async function refunds(_body: any, _params?: any, _query?: any) {
  const refunds = Array.from(store.payments.values()).filter(p => p.status === 'refunded');
  return { module: 'admin', action: 'refunds', ok: true, refunds, riders: listUsersByRole('rider').map(sanitizeUser) };
}

export async function platform_stats(_body: any, _params?: any, _query?: any) {
  const users = Array.from(store.users.values());
  const rides = Array.from(store.rides.values());
  const payments = Array.from(store.payments.values());
  const totalRevenueCents = payments.filter(p => p.status === 'captured').reduce((s, p) => s + p.amountCents, 0);
  return {
    module: 'admin',
    action: 'platform-stats',
    ok: true,
    stats: {
      totalUsers: users.length,
      riders: users.filter(u => u.role === 'rider').length,
      drivers: users.filter(u => u.role === 'driver').length,
      merchants: users.filter(u => u.role === 'merchant').length,
      totalRides: rides.length,
      activeRides: rides.filter(r => ['requested', 'accepted', 'started'].includes(r.status)).length,
      completedRides: rides.filter(r => r.status === 'completed').length,
      totalPayments: payments.length,
      totalRevenueCents,
      openTickets: Array.from(store.tickets.values()).filter(t => t.status === 'open').length,
      openIncidents: store.safetyIncidents.filter(i => i.status === 'open' || i.status === 'under_review').length,
      pendingDrivers: Array.from(store.drivers.values()).filter(d => d.status === 'pending').length
    }
  };
}

export async function admin_overview(_body: any, _params?: any, _query?: any) {
  const statsResponse = await platform_stats({}, _params, _query);
  const stats = statsResponse.stats;
  const users = Array.from(store.users.values()).map(sanitizeUser);
  const usersById = new Map(users.map(user => [user.id, user]));
  const rides = Array.from(store.rides.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const tickets = Array.from(store.tickets.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const incidents = [...store.safetyIncidents].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const payments = Array.from(store.payments.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const walletLedger = [...store.walletTx].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const drivers = Array.from(store.drivers.values())
    .map(profile => {
      const driverRides = rides.filter(ride => ride.driverId === profile.userId);
      const completedTrips = driverRides.filter(ride => ride.status === 'completed').length;
      const activeRide = driverRides.find(ride => ['requested', 'accepted', 'started'].includes(ride.status));
      const incidentsCount = incidents.filter(incident => incident.userId === profile.userId).length;
      return {
        ...profile,
        user: usersById.get(profile.userId),
        tripCount: driverRides.length,
        completedTrips,
        activeRideId: activeRide?.id,
        incidentsCount,
        walletBalanceCents: getWalletBalanceCents(profile.userId)
      };
    })
    .sort((a, b) => (b.earningsCents || 0) - (a.earningsCents || 0));

  const riders = users
    .filter(user => user.role === 'rider')
    .map(user => {
      const riderRides = rides.filter(ride => ride.riderId === user.id);
      const spendingCents = payments
        .filter(payment => payment.riderId === user.id && payment.status === 'captured')
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      return {
        user,
        tripCount: riderRides.length,
        completedTrips: riderRides.filter(ride => ride.status === 'completed').length,
        activeTrips: riderRides.filter(ride => ['requested', 'accepted', 'started'].includes(ride.status)).length,
        spendingCents,
        retentionScore: riderRides.length ? Math.min(100, 50 + riderRides.length * 5) : 0
      };
    })
    .sort((a, b) => b.spendingCents - a.spendingCents);

  const ticketsWithUsers = tickets.map(ticket => ({ ...ticket, user: usersById.get(ticket.userId) }));
  const incidentsWithUsers = incidents.map(incident => ({ ...incident, user: incident.userId ? usersById.get(incident.userId) : undefined }));
  const { restaurants, orders, reviews } = await getRestaurantAdminSnapshot();

  const closedTickets = tickets.filter(ticket => ticket.status === 'closed');
  const avgResolutionHours = closedTickets.length
    ? Number(
        (
          closedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.createdAt).getTime();
            const updated = new Date(ticket.updatedAt).getTime();
            return sum + Math.max(0, updated - created);
          }, 0) /
          closedTickets.length /
          MS_PER_HOUR
        ).toFixed(1)
      )
    : 0;

  return {
    module: 'admin',
    action: 'overview',
    ok: true,
    stats,
    realtime: {
      activeDrivers: drivers.filter(driver => driver.availabilityStatus === 'online' || driver.availabilityStatus === 'assigned').length,
      activeRides: rides.filter(ride => ['requested', 'accepted', 'started'].includes(ride.status)).length,
      highPriorityIncidents: incidents.filter(incident => incident.level === 'high' && incident.status !== 'resolved').length,
      newTickets: tickets.filter(ticket => ticket.status === 'open').length
    },
    settings: getSettings(),
    drivers,
    riders,
    users,
    rides,
    tickets: ticketsWithUsers,
    incidents: incidentsWithUsers,
    payments,
    refunds: payments.filter(payment => payment.status === 'refunded'),
    walletLedger,
    walletBalances: users.map(user => ({ userId: user.id, balanceCents: getWalletBalanceCents(user.id) })),
    promos: Array.from(store.promos.values()).sort((a, b) => a.code.localeCompare(b.code)),
    markets: Array.from(store.markets.values()).sort((a, b) => a.city.localeCompare(b.city)),
    referralEvents: [...store.referralEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    apiKeys: store.adminApiKeys.map(sanitizeApiKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    auditLogs: [...store.auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
    restaurants,
    orders,
    reviews,
    exportJobs: [...store.adminExportJobs],
    importJobs: [...store.adminImportJobs],
    bulkJobs: [...store.adminBulkJobs],
    analytics: {
      revenueByDay: aggregateSeries(payments.filter(payment => payment.status === 'captured'), payment => payment.capturedAt || payment.createdAt, payment => payment.amountCents, 'day'),
      revenueByWeek: aggregateSeries(payments.filter(payment => payment.status === 'captured'), payment => payment.capturedAt || payment.createdAt, payment => payment.amountCents, 'week'),
      revenueByMonth: aggregateSeries(payments.filter(payment => payment.status === 'captured'), payment => payment.capturedAt || payment.createdAt, payment => payment.amountCents, 'month'),
      tripVolumeByDay: aggregateSeries(rides, ride => ride.createdAt, () => 1, 'day'),
      userGrowthByDay: aggregateSeries(Array.from(store.users.values()), user => user.createdAt, () => 1, 'day'),
      driverLeaderboard: drivers.slice(0, 5).map(driver => ({
        driverId: driver.userId,
        name: driver.user?.email || driver.userId,
        earningsCents: driver.earningsCents,
        rating: driver.rating,
        tripCount: driver.tripCount
      })),
      riderLeaderboard: riders.slice(0, 5).map(rider => ({
        riderId: rider.user.id,
        name: rider.user.email || rider.user.id,
        spendingCents: rider.spendingCents,
        tripCount: rider.tripCount,
        retentionScore: rider.retentionScore
      })),
      support: {
        open: tickets.filter(ticket => ticket.status === 'open').length,
        pending: tickets.filter(ticket => ticket.status === 'in_review').length,
        resolved: closedTickets.length,
        avgResolutionHours,
        satisfactionScore: closedTickets.length ? Number(Math.min(99, 84 + closedTickets.length).toFixed(1)) : 0
      },
      safety: {
        open: incidents.filter(incident => incident.status === 'open').length,
        underReview: incidents.filter(incident => incident.status === 'under_review').length,
        resolved: incidents.filter(incident => incident.status === 'resolved').length,
        dismissed: incidents.filter(incident => incident.status === 'dismissed').length
      },
      finance: {
        capturedRevenueCents: payments.filter(payment => payment.status === 'captured').reduce((sum, payment) => sum + payment.amountCents, 0),
        pendingSettlementCents: payments.filter(payment => payment.status === 'requires_capture').reduce((sum, payment) => sum + payment.amountCents, 0),
        refundedCents: payments.filter(payment => payment.status === 'refunded').reduce((sum, payment) => sum + payment.amountCents, 0),
        walletExposureCents: users.reduce((sum, user) => sum + getWalletBalanceCents(user.id), 0)
      }
    }
  };
}

export async function list_users(body: any, _params?: any, _query?: any) {
  const role = body?.role;
  const users = role ? listUsersByRole(role) : Array.from(store.users.values());
  const safeUsers = users.map(sanitizeUser);
  return { module: 'admin', action: 'list-users', ok: true, users: safeUsers };
}

export async function suspend_user(body: any, _params?: any, _query?: any) {
  const user = store.users.get(body?.userId);
  if (!user) return { module: 'admin', action: 'suspend-user', error: 'user not found' };
  const suspend = body?.suspend !== false;
  (user as any).suspended = suspend;
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, suspend ? 'user_suspended' : 'user_unsuspended', body.userId, 'user', { suspend });
  }
  return { module: 'admin', action: 'suspend-user', ok: true, userId: body.userId, suspended: suspend };
}

export async function update_ticket(body: any, _params?: any, _query?: any) {
  const ticket = store.tickets.get(body?.ticketId);
  if (!ticket) return { module: 'admin', action: 'update-ticket', error: 'ticket not found' };
  const allowedStatuses = ['open', 'in_review', 'closed'] as const;
  if (body?.status && allowedStatuses.includes(body.status)) {
    ticket.status = body.status;
    ticket.updatedAt = timestamp();
    if (body?.resolution) ticket.resolution = body.resolution;
  }
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'ticket_updated', ticket.id, 'ticket', { status: ticket.status });
  }
  return { module: 'admin', action: 'update-ticket', ok: true, ticket };
}

export async function audit_log(body: any, _params?: any, _query?: any) {
  const limit = Math.min(Number(body?.limit) || 100, 500);
  const logs = store.auditLogs.slice(-limit).reverse();
  return { module: 'admin', action: 'audit-log', ok: true, logs };
}

export async function update_settings(body: any, _params?: any, _query?: any) {
  const current = getSettings();
  const settings: PlatformSettings = {
    maintenanceMode: typeof body?.maintenanceMode === 'boolean' ? body.maintenanceMode : current.maintenanceMode,
    appVersion: typeof body?.appVersion === 'string' && body.appVersion.trim() ? body.appVersion.trim() : current.appVersion,
    commissionRatePercent: safeNumber(body?.commissionRatePercent, current.commissionRatePercent),
    surgeMultiplier: safeNumber(body?.surgeMultiplier, current.surgeMultiplier),
    featureFlags: normalizeFeatureFlags(body?.featureFlags, current.featureFlags),
    updatedAt: timestamp()
  };
  store.platformSettings.set('global', settings);
  store.surgeConfig.set('global', {
    multiplier: settings.surgeMultiplier,
    reason: 'admin_update',
    updatedAt: settings.updatedAt
  });
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'settings_updated', 'global', 'platform_settings', {
      maintenanceMode: settings.maintenanceMode,
      commissionRatePercent: settings.commissionRatePercent,
      surgeMultiplier: settings.surgeMultiplier
    });
  }
  return { module: 'admin', action: 'update-settings', ok: true, settings };
}

export async function upsert_promo(body: any, _params?: any, _query?: any) {
  const code = String(body?.code || '').trim().toUpperCase();
  if (!code) return { module: 'admin', action: 'upsert-promo', error: 'promo code is required' };
  const existing = store.promos.get(code);
  const promo: Promo = {
    id: existing?.id || makeId('promo'),
    code,
    discountType: body?.discountType === 'percent' ? 'percent' : 'flat',
    discountValue: Math.max(0, safeNumber(body?.discountValue, existing?.discountValue || 0)),
    active: body?.active !== false,
    minFareCents: optionalNumber(body?.minFareCents) ?? existing?.minFareCents,
    maxUsages: optionalNumber(body?.maxUsages) ?? existing?.maxUsages,
    usageCount: existing?.usageCount || 0,
    expiresAt: typeof body?.expiresAt === 'string' && body.expiresAt ? body.expiresAt : existing?.expiresAt,
    createdAt: existing?.createdAt || timestamp()
  };
  store.promos.set(code, promo);
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, existing ? 'promo_updated' : 'promo_created', promo.id, 'promo', { code: promo.code });
  }
  return { module: 'admin', action: 'upsert-promo', ok: true, promo };
}

export async function upsert_market(body: any, _params?: any, _query?: any) {
  const marketId = String(body?.id || '').trim();
  const existing = marketId ? store.markets.get(marketId) : undefined;
  const market: MarketConfig = {
    id: existing?.id || makeId('market'),
    name: typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : existing?.name || 'New market',
    city: typeof body?.city === 'string' && body.city.trim() ? body.city.trim() : existing?.city || 'Unknown city',
    country: typeof body?.country === 'string' && body.country.trim() ? body.country.trim() : existing?.country || 'Unknown country',
    status: ['pre_launch', 'active', 'paused', 'sunset'].includes(body?.status) ? body.status : existing?.status || 'pre_launch',
    launchedAt: typeof body?.launchedAt === 'string' && body.launchedAt ? body.launchedAt : existing?.launchedAt,
    createdAt: existing?.createdAt || timestamp(),
    updatedAt: timestamp()
  };
  store.markets.set(market.id, market);
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, existing ? 'market_updated' : 'market_created', market.id, 'market', {
      city: market.city,
      status: market.status
    });
  }
  return { module: 'admin', action: 'upsert-market', ok: true, market };
}

export async function create_api_key(body: any, _params?: any, _query?: any) {
  const name = String(body?.name || '').trim();
  if (!name) return { module: 'admin', action: 'create-api-key', error: 'api key name is required' };
  const plainTextKey = `drv_admin_${randomBytes(API_KEY_RANDOM_BYTES).toString('hex')}`;
  const apiKey: AdminApiKey = {
    id: makeId('key'),
    name,
    keyPreview: `${plainTextKey.slice(0, 12)}…${plainTextKey.slice(-4)}`,
    keyHash: createHash('sha256').update(plainTextKey).digest('hex'),
    createdAt: timestamp()
  };
  store.adminApiKeys.push(apiKey);
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'api_key_created', apiKey.id, 'api_key', { name });
  }
  return { module: 'admin', action: 'create-api-key', ok: true, apiKey: sanitizeApiKey(apiKey), plainTextKey };
}

export async function revoke_api_key(body: any, _params?: any, _query?: any) {
  const apiKey = store.adminApiKeys.find(key => key.id === body?.apiKeyId);
  if (!apiKey) return { module: 'admin', action: 'revoke-api-key', error: 'api key not found' };
  apiKey.revokedAt = timestamp();
  markStoreDirty();
  const actor = body?.__actor;
  if (actor) {
    appendAuditLog(actor.sub || actor.id, actor.role, 'api_key_revoked', apiKey.id, 'api_key', { name: apiKey.name });
  }
  return { module: 'admin', action: 'revoke-api-key', ok: true, apiKey: sanitizeApiKey(apiKey) };
}

export async function export_data(body: any, _params?: any, _query?: any) {
  return createExportJob(body, body?.__actor);
}

export async function import_data(body: any, _params?: any, _query?: any) {
  if (body?.rollbackImportId) {
    return rollbackImportJob(String(body.rollbackImportId), body?.__actor);
  }
  const dataType = String(body?.dataType || 'users');
  const format = String(body?.format || 'json').toLowerCase();
  const records = parseImportRecords(body);
  if (body?.previewOnly !== false && !body?.confirm) {
    return previewImport(dataType, format, records, body?.__actor);
  }
  return applyImport(dataType, format, records, body?.__actor);
}

export async function bulk_operation(body: any, _params?: any, _query?: any) {
  return runBulkOperationInternal(body, body?.__actor);
}
