#!/usr/bin/env node
/**
 * Seed database with test users for local development.
 * Run: npm run db:seed
 * 
 * This works with both memory and file-based data stores.
 * For file mode, data is persisted to .data/store.json
 */

import { env } from '../../config/env';
import { store, makeId, timestamp } from '../data.store';
import { randomBytes, scryptSync } from 'crypto';

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function runSeeds() {
  const seeded: string[] = [];

  // Helper to check if user exists
  const userExists = (email: string) => {
    return Array.from(store.users.values()).some(u => u.email === email);
  };

  // Seed Admin User
  if (!userExists('admin@drive.com')) {
    const adminId = makeId('user');
    store.users.set(adminId, {
      id: adminId,
      email: 'admin@drive.com',
      password: hashPassword(env.adminSeedPassword),
      role: 'admin',
      createdAt: timestamp()
    });
    seeded.push('admin@drive.com (admin)');
  }

  // Seed Test Rider User
  if (!userExists('rider@test.com')) {
    const riderId = makeId('user');
    store.users.set(riderId, {
      id: riderId,
      email: 'rider@test.com',
      password: hashPassword(env.testRiderSeedPassword || 'Test123!@#$'),
      role: 'rider',
      createdAt: timestamp()
    });
    // Create default rider profile
    store.riders.set(riderId, {
      userId: riderId,
      favoriteLocations: [],
      rating: 5,
      reviewCount: 0
    });
    seeded.push('rider@test.com (rider)');
  }

  // Seed Test Rider User (rider@example.com for backward compatibility)
  if (!userExists('rider@example.com')) {
    const riderId = makeId('user');
    store.users.set(riderId, {
      id: riderId,
      email: 'rider@example.com',
      password: hashPassword(env.testRiderSeedPassword || 'Test123!@#$'),
      role: 'rider',
      createdAt: timestamp()
    });
    // Create default rider profile
    store.riders.set(riderId, {
      userId: riderId,
      favoriteLocations: [],
      rating: 5,
      reviewCount: 0
    });
    seeded.push('rider@example.com (rider)');
  }

  // Seed Test Driver User
  if (!userExists('driver@test.com')) {
    const driverId = makeId('user');
    store.users.set(driverId, {
      id: driverId,
      email: 'driver@test.com',
      password: hashPassword(env.testDriverSeedPassword || 'Driver123!@#$'),
      role: 'driver',
      createdAt: timestamp()
    });
    // Create default driver profile
    store.drivers.set(driverId, {
      userId: driverId,
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
  }

  // Seed Test Driver User (driver@example.com for backward compatibility)
  if (!userExists('driver@example.com')) {
    const driverId = makeId('user');
    store.users.set(driverId, {
      id: driverId,
      email: 'driver@example.com',
      password: hashPassword(env.testDriverSeedPassword || 'Driver123!@#$'),
      role: 'driver',
      createdAt: timestamp()
    });
    // Create default driver profile
    store.drivers.set(driverId, {
      userId: driverId,
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
  }

  return {
    ok: true,
    seeded,
    dataStoreMode: env.dataStoreMode,
    dataStoreFile: env.dataStoreMode === 'file' ? env.dataStoreFile : null,
    message: `Seeded ${seeded.length} user(s) to ${env.dataStoreMode} store`
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
      console.log('  Password: Check .env ADMIN_SEED_PASSWORD');
      console.log('\nRider:');
      console.log('  Email: rider@example.com or rider@test.com');
      console.log('  Password: Check .env TEST_RIDER_SEED_PASSWORD');
      console.log('\nDriver:');
      console.log('  Email: driver@example.com or driver@test.com');
      console.log('  Password: Check .env TEST_DRIVER_SEED_PASSWORD');
      console.log('\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { runSeeds };
