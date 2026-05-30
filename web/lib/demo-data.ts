import type { AddressSuggestion, PaymentMethod, RideReceipt, RideSummary, SavedAddress, SupportTicket, WalletEntry } from './types';

const now = new Date().toISOString();

export const rideTypes = [
  { id: 'economy', name: 'Economy', description: 'Affordable daily rides', eta: '3 min', multiplier: 1, seats: 4 },
  { id: 'comfort', name: 'Comfort', description: 'Newer vehicles with extra space', eta: '5 min', multiplier: 1.35, seats: 4 },
  { id: 'premium', name: 'Premium', description: 'Luxury ride with top-rated drivers', eta: '7 min', multiplier: 1.85, seats: 4 },
];

export const savedAddresses: SavedAddress[] = [
  { id: 'home', label: 'Home', address: '15 Market Street, San Francisco, CA', note: 'Ring bell at unit 9B' },
  { id: 'work', label: 'Work', address: '410 Mission Street, San Francisco, CA', note: 'Lobby drop-off preferred' },
  { id: 'gym', label: 'Gym', address: '200 King Street, San Francisco, CA' },
];

export const paymentMethods: PaymentMethod[] = [
  { id: 'card_1', label: 'Visa ending in 4242', type: 'card', detail: 'Exp 12/28', default: true },
  { id: 'wallet_1', label: 'Apple Pay', type: 'wallet', detail: 'Touch ID enabled' },
  { id: 'card_2', label: 'Business Mastercard', type: 'card', detail: 'Exp 09/27' },
];

export const walletEntries: WalletEntry[] = [
  { id: 'tx_1', kind: 'credit', amountCents: 2500, reason: 'wallet_top_up', createdAt: now },
  { id: 'tx_2', kind: 'debit', amountCents: 1840, reason: 'ride:ride_demo_1:fare', createdAt: now },
  { id: 'tx_3', kind: 'credit', amountCents: 700, reason: 'referral_bonus', createdAt: now },
];

export const demoRides: RideSummary[] = [
  {
    id: 'ride_demo_1',
    riderId: 'demo-rider',
    driverId: 'driver-132',
    pickupLat: 37.7749,
    pickupLng: -122.4194,
    dropoffLat: 37.7848,
    dropoffLng: -122.4075,
    miles: 4.2,
    minutes: 16,
    fareEstimate: 18.4,
    status: 'started',
    createdAt: now,
    updatedAt: now,
    events: [
      { id: 'evt_1', type: 'driver_assigned', title: 'Driver assigned', message: 'A driver is on the way.', createdAt: now },
      { id: 'evt_2', type: 'passenger_onboard', title: 'Passenger onboard', message: 'You are now in transit.', createdAt: now },
    ],
    latestEvent: { id: 'evt_2', type: 'passenger_onboard', title: 'Passenger onboard', message: 'You are now in transit.', createdAt: now },
    availableActions: { canCancel: false, canRate: false, canViewReceipt: false, canTrackDriver: true },
  },
  {
    id: 'ride_demo_2',
    riderId: 'demo-rider',
    driverId: 'driver-84',
    pickupLat: 37.792,
    pickupLng: -122.396,
    dropoffLat: 37.781,
    dropoffLng: -122.405,
    miles: 6.1,
    minutes: 21,
    fareEstimate: 24.75,
    status: 'completed',
    rating: 5,
    review: 'Smooth trip and a clean vehicle.',
    createdAt: now,
    updatedAt: now,
    events: [
      { id: 'evt_3', type: 'driver_assigned', title: 'Driver assigned', message: 'Pickup confirmed.', createdAt: now },
      { id: 'evt_4', type: 'ride_completed', title: 'Ride completed', message: 'Receipt is ready.', createdAt: now },
      { id: 'evt_5', type: 'ride_rated', title: 'Trip rated', message: 'Thanks for the feedback.', createdAt: now },
    ],
    latestEvent: { id: 'evt_5', type: 'ride_rated', title: 'Trip rated', message: 'Thanks for the feedback.', createdAt: now },
    availableActions: { canCancel: false, canRate: false, canViewReceipt: true, canTrackDriver: false },
  },
];

export const demoReceipt: RideReceipt = {
  receiptType: 'ride_receipt',
  invoiceNumber: 'INV-RIDE-DEMO-2',
  rideId: 'ride_demo_2',
  riderId: 'demo-rider',
  driverId: 'driver-84',
  status: 'completed',
  currency: 'USD',
  issuedAt: now,
  fareBreakdown: {
    currency: 'USD',
    baseFare: 2.5,
    distanceFare: 11.59,
    timeFare: 5.25,
    subtotal: 19.34,
    fareEstimate: 24.75,
    fareEstimateRange: { low: 22.8, high: 27.2 },
  },
  surgeMultiplier: 1.2,
  discountCents: 500,
  totalCents: 2475,
  paymentStatus: 'settled_internal',
  walletEntries,
};

export const notifications = [
  { id: 'notify_1', title: 'Driver nearby', body: 'Alex is 2 minutes away from pickup.', timestamp: 'Just now' },
  { id: 'notify_2', title: 'Promo unlocked', body: 'Use DRIVE10 for 10% off your next trip.', timestamp: '10 min ago' },
  { id: 'notify_3', title: 'Wallet top-up successful', body: 'Your wallet balance increased by $25.00.', timestamp: 'Yesterday' },
];

export const faqItems = [
  { id: 'faq_1', question: 'How do I contact my driver?', answer: 'Use the in-ride support panel to send a message or tap the call action.' },
  { id: 'faq_2', question: 'Can I schedule rides in advance?', answer: 'Yes. Use the Scheduled route planner to set pickup windows and reminders.' },
  { id: 'faq_3', question: 'How are refunds handled?', answer: 'Open a support ticket from the Help Center or use the refund review workflow in support.' },
];

export const supportTickets: SupportTicket[] = [
  {
    id: 'ticket_1',
    type: 'lost_and_found',
    message: 'I left my headphones in the back seat.',
    status: 'in_review',
    replies: [{ id: 'reply_1', authorRole: 'support', message: 'We contacted the driver and will update you shortly.', createdAt: now }],
    createdAt: now,
    updatedAt: now,
  },
];

export const promos = [
  { id: 'promo_1', code: 'DRIVE10', discountType: 'percent', discountValue: 10, usageCount: 14, expiresAt: '2026-06-15T00:00:00.000Z' },
  { id: 'promo_2', code: 'AIRPORT5', discountType: 'flat', discountValue: 500, usageCount: 8, expiresAt: '2026-07-01T00:00:00.000Z' },
];

export const referralSummary = {
  code: 'REFDEMO42',
  totalBonusCents: 2100,
  invites: [
    { id: 'ref_1', referredUserId: 'friend_1', bonusCents: 700, paid: true, createdAt: now },
    { id: 'ref_2', referredUserId: 'friend_2', bonusCents: 700, paid: true, createdAt: now },
    { id: 'ref_3', referredUserId: 'friend_3', bonusCents: 700, paid: true, createdAt: now },
  ],
};

export const addressSuggestions: AddressSuggestion[] = [
  { id: 'addr_1', title: 'SFO International Airport', subtitle: 'San Francisco, CA', lat: 37.6213, lng: -122.379 },
  { id: 'addr_2', title: 'Union Square', subtitle: '333 Post Street, San Francisco, CA', lat: 37.7881, lng: -122.4075 },
  { id: 'addr_3', title: 'Golden Gate Park', subtitle: '501 Stanyan Street, San Francisco, CA', lat: 37.7694, lng: -122.4862 },
  { id: 'addr_4', title: 'Chase Center', subtitle: '1 Warriors Way, San Francisco, CA', lat: 37.768, lng: -122.3877 },
];

export const scheduledRides = [
  { id: 'sched_1', route: 'Home → SFO International Airport', pickupWindow: 'Tomorrow · 06:15 AM', status: 'confirmed' },
  { id: 'sched_2', route: 'Work → Oracle Park', pickupWindow: 'Fri · 05:45 PM', status: 'awaiting_driver' },
];

export const savedTrips = [
  { id: 'trip_1', label: 'Daily commute', from: 'Home', to: 'Work', frequency: 'Weekdays' },
  { id: 'trip_2', label: 'Airport transfer', from: 'Home', to: 'SFO International Airport', frequency: 'As needed' },
];

export const emergencyContacts = [
  { id: 'contact_1', name: 'Jordan Lee', relation: 'Sibling', phone: '+1 (415) 555-0101' },
  { id: 'contact_2', name: 'Mina Patel', relation: 'Partner', phone: '+1 (415) 555-0192' },
];
