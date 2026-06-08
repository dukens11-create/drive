#!/usr/bin/env node
/**
 * Seed database with test users for local development.
 * Run: npm run db:seed
 * 
 * This ALWAYS creates fresh test users and persists them to .data/store.json
 */

import { env } from '../../config/env';
import { store, makeId, timestamp } from '../data.store';
import { randomBytes, scryptSync } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Convert store to serializable format (copy from data.store.ts)
 */
function toSerializableStore() {
  return {
    users: Array.from(store.users.values()),
    refreshTokens: Array.from(store.refreshTokens.entries()),
    rides: Array.from(store.rides.values()),
    drivers: Array.from(store.drivers.values()),
    vehicles: Array.from(store.vehicles.values()),
    riders: Array.from(store.riders.values()),
    rideRequests: Array.from(store.rideRequests.values()),
    payments: Array.from(store.payments.values()),
    paymentMethods: Array.from(store.paymentMethods.values()),
    invoices: Array.from(store.invoices.values()),
    refunds: Array.from(store.refunds.values()),
    walletTx: [...store.walletTx],
    walletBalances: Array.from(store.walletBalances.values()),
    kycStatus: Array.from(store.kycStatus.entries()),
    kycSessions: Array.from(store.kycSessions.entries()),
    kycVerifications: Array.from(store.kycVerifications.entries()),
    kycSelfies: Array.from(store.kycSelfies.entries()),
    tickets: Array.from(store.tickets.values()),
    safetyIncidents: [...store.safetyIncidents],
    merchantProducts: Array.from(store.merchantProducts.values()),
    marketplaceDeliveries: Array.from(store.marketplaceDeliveries.values()),
    auditLogs: [...store.auditLogs],
    surgeConfig: Array.from(store.surgeConfig.entries()),
    promos: Array.from(store.promos.entries()),
    referralCodes: Array.from(store.referralCodes.entries()),
    referralEvents: [...store.referralEvents],
    markets: Array.from(store.markets.entries()),
    adminApiKeys: [...store.adminApiKeys],
    platformSettings: Array.from(store.platformSettings.entries()),
    adminExportJobs: [...store.adminExportJobs],
    adminImportJobs: [...store.adminImportJobs],
    adminBulkJobs: [...store.adminBulkJobs],
    scheduledRides: Array.from(store.scheduledRides.values()),
    subscriptionPlans: Array.from(store.subscriptionPlans.entries()),
    userSubscriptions: Array.from(store.userSubscriptions.entries()),
    loyaltyAccounts: Array.from(store.loyaltyAccounts.entries()),
    loyaltyTransactions: [...store.loyaltyTransactions],
    corporateAccounts: Array.from(store.corporateAccounts.entries()),
    corporateRideTags: [...store.corporateRideTags],
    carpoolRides: Array.from(store.carpoolRides.entries()),
    chargebacks: [...store.chargebacks],
    fraudAlerts: [...store.fraudAlerts],
    totpEntries: Array.from(store.totpEntries.entries()),
    chatConversations: Array.from(store.chatConversations.entries()),
    chatParticipants: [...store.chatParticipants],
    chatMessages: [...store.chatMessages],
    quickReplyTemplates: [...store.quickReplyTemplates],
    callSessions: [...store.callSessions],
    notificationLogs: [...store.notificationLogs],
    notificationPreferences: Array.from(store.notificationPreferences.entries()),
    deviceTokens: [...store.deviceTokens],
    savedSearches: [...store.savedSearches],
    searchHistory: [...store.searchHistory],
    bankAccounts: Array.from(store.bankAccounts.entries()),
    payoutRequests: Array.from(store.payoutRequests.entries()),
    locationHistory: [...store.locationHistory],
    dispatchEvents: [...store.dispatchEvents]
  };
}

/**
 * Persist store to file synchronously
 */
function persistStore() {
  if (env.dataStoreMode !== 'file') {
    console.log('⚠️  DataStore mode is not "file", skipping persistence');
    return;
  }
  
  const payload = JSON.stringify(toSerializableStore(), null, 2);
  const resolvedPath = path.resolve(env.dataStoreFile);
  
  try {
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, payload, 'utf8');
    console.log(`✅ Persisted ${Array.from(store.users.values()).length} users to ${resolvedPath}`);
  } catch (error) {
    console.error(`❌ Failed to persist store:`, error);
    throw error;
  }
}

async function runSeeds() {
  console.log(`📝 Seeding with DATA_STORE_MODE=${env.dataStoreMode}`);
  
  const seeded: string[] = [];
  
  // Clear existing users from memory (fresh seed)
  store.users.clear();
  store.riders.clear();
  store.drivers.clear();

  // Seed Admin User
  const adminId = makeId('user');
  store.users.set(adminId, {
    id: adminId,
    email: 'admin@drive.com',
    password: hashPassword(env.adminSeedPassword),
    role: 'admin',
    createdAt: timestamp()
  });
  seeded.push('admin@drive.com (admin)');

  // Seed Test Rider User (rider@test.com)
  const riderId1 = makeId('user');
  store.users.set(riderId1, {
    id: riderId1,
    email: 'rider@test.com',
    password: hashPassword(env.testRiderSeedPassword || 'Test123!@#$'),
    role: 'rider',
    createdAt: timestamp()
  });
  store.riders.set(riderId1, {
    userId: riderId1,
    favoriteLocations: [],
    rating: 5,
    reviewCount: 0
  });
  seeded.push('rider@test.com (rider)');

  // Seed Test Rider User (rider@example.com) - THE IMPORTANT ONE!
  const riderId2 = makeId('user');
  store.users.set(riderId2, {
    id: riderId2,
    email: 'rider@example.com',
    password: hashPassword(env.testRiderSeedPassword || 'Test123!@#$'),
    role: 'rider',
    createdAt: timestamp()
  });
  store.riders.set(riderId2, {
    userId: riderId2,
    favoriteLocations: [],
    rating: 5,
    reviewCount: 0
  });
  seeded.push('rider@example.com (rider)');

  // Seed Test Driver User (driver@test.com)
  const driverId1 = makeId('user');
  store.users.set(driverId1, {
    id: driverId1,
    email: 'driver@test.com',
    password: hashPassword(env.testDriverSeedPassword || 'Driver123!@#$'),
    role: 'driver',
    createdAt: timestamp()
  });
  store.drivers.set(driverId1, {
    userId: driverId1,
    status: 'approved',
    verificationState: 'verified',
    availabilityStatus: 'offline',
    available: false,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: [],
    verificationDocuments: [],
    selfieVerification: {
      status: 'missing',
      score: 0
    },
    verificationReview: {
      status: 'approved'
    }
  });
  seeded.push('driver@test.com (driver)');

  // Seed Test Driver User (driver@example.com)
  const driverId2 = makeId('user');
  store.users.set(driverId2, {
    id: driverId2,
    email: 'driver@example.com',
    password: hashPassword(env.testDriverSeedPassword || 'Driver123!@#$'),
    role: 'driver',
    createdAt: timestamp()
  });
  store.drivers.set(driverId2, {
    userId: driverId2,
    status: 'approved',
    verificationState: 'verified',
    availabilityStatus: 'offline',
    available: false,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: [],
    verificationDocuments: [],
    selfieVerification: {
      status: 'missing',
      score: 0
    },
    verificationReview: {
      status: 'approved'
    }
  });
  seeded.push('driver@example.com (driver)');

  // CRITICAL: Persist to disk if in file mode!
  persistStore();

  return {
    ok: true,
    seeded,
    dataStoreMode: env.dataStoreMode,
    dataStoreFile: env.dataStoreMode === 'file' ? env.dataStoreFile : null,
    message: `✅ Seeded ${seeded.length} user(s) to ${env.dataStoreMode} store`
  };
}

if (require.main === module) {
  runSeeds()
    .then(result => {
      console.log('\n✅ Database seeded successfully!\n');
      console.log(JSON.stringify(result, null, 2));
      console.log('\n📝 Test Credentials:\n');
      console.log('Admin:');
      console.log('  Email: admin@drive.com');
      console.log('  Password: FlupflapHaiti2025@');
      console.log('\nRider:');
      console.log('  Email: rider@example.com or rider@test.com');
      console.log('  Password: Test123!@#$');
      console.log('\nDriver:');
      console.log('  Email: driver@example.com or driver@test.com');
      console.log('  Password: Driver123!@#$');
      console.log('\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { runSeeds };
