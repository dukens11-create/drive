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

export const demoRestaurants: import('./types').Restaurant[] = [
  {
    id: 'rest_1',
    name: 'Golden Dragon',
    cuisine: ['Chinese', 'Asian'],
    rating: 4.6,
    reviewCount: 312,
    deliveryTimeMins: 30,
    deliveryFeeCents: 199,
    minimumOrderCents: 1000,
    open: true,
    distanceMiles: 0.8,
    priceRange: 2,
    description: 'Authentic Cantonese cuisine with dim sum, noodles, and BBQ specialties.',
  },
  {
    id: 'rest_2',
    name: 'Bella Italia',
    cuisine: ['Italian', 'Pizza'],
    rating: 4.8,
    reviewCount: 527,
    deliveryTimeMins: 40,
    deliveryFeeCents: 299,
    minimumOrderCents: 1500,
    open: true,
    distanceMiles: 1.3,
    priceRange: 2,
    description: 'Wood-fired Neapolitan pizzas and house-made pasta since 2008.',
  },
  {
    id: 'rest_3',
    name: 'Spice Garden',
    cuisine: ['Indian', 'Vegetarian'],
    rating: 4.7,
    reviewCount: 248,
    deliveryTimeMins: 35,
    deliveryFeeCents: 149,
    minimumOrderCents: 1200,
    open: true,
    distanceMiles: 2.1,
    priceRange: 1,
    description: 'North and South Indian curries, biryani, and street food favorites.',
  },
  {
    id: 'rest_4',
    name: 'Taco Loco',
    cuisine: ['Mexican', 'Street Food'],
    rating: 4.5,
    reviewCount: 193,
    deliveryTimeMins: 25,
    deliveryFeeCents: 99,
    minimumOrderCents: 800,
    open: false,
    distanceMiles: 0.5,
    priceRange: 1,
    description: 'Street-style tacos, burritos, and fresh guacamole.',
  },
];

export const demoMenuCategories: import('./types').MenuCategory[] = [
  {
    id: 'cat_1',
    name: 'Popular',
    description: 'Our most-loved dishes',
    items: [
      {
        id: 'item_1',
        restaurantId: 'rest_2',
        categoryId: 'cat_1',
        name: 'Margherita Pizza',
        description: 'San Marzano tomatoes, fresh mozzarella, basil, extra-virgin olive oil.',
        priceCents: 1799,
        available: true,
        popular: true,
        calories: 780,
        allergens: ['gluten', 'dairy'],
        customizations: [
          {
            id: 'cust_1',
            label: 'Size',
            required: true,
            multiSelect: false,
            options: [
              { id: 'size_s', label: '10" Small', priceCents: 0 },
              { id: 'size_l', label: '14" Large', priceCents: 400 },
            ],
          },
          {
            id: 'cust_2',
            label: 'Extra toppings',
            required: false,
            multiSelect: true,
            options: [
              { id: 'top_basil', label: 'Extra basil', priceCents: 50 },
              { id: 'top_pep', label: 'Pepperoni', priceCents: 150 },
            ],
          },
        ],
      },
      {
        id: 'item_2',
        restaurantId: 'rest_2',
        categoryId: 'cat_1',
        name: 'Pasta Carbonara',
        description: 'Rigatoni, guanciale, pecorino romano, black pepper, egg yolk.',
        priceCents: 1599,
        available: true,
        popular: true,
        calories: 670,
        allergens: ['gluten', 'eggs', 'dairy'],
      },
    ],
  },
  {
    id: 'cat_2',
    name: 'Starters',
    items: [
      {
        id: 'item_3',
        restaurantId: 'rest_2',
        categoryId: 'cat_2',
        name: 'Bruschetta al Pomodoro',
        description: 'Grilled sourdough, cherry tomatoes, garlic, fresh basil.',
        priceCents: 899,
        available: true,
        calories: 310,
        allergens: ['gluten'],
      },
    ],
  },
  {
    id: 'cat_3',
    name: 'Drinks',
    items: [
      {
        id: 'item_4',
        restaurantId: 'rest_2',
        categoryId: 'cat_3',
        name: 'San Pellegrino',
        description: 'Sparkling mineral water, 500 ml.',
        priceCents: 349,
        available: true,
        calories: 0,
      },
    ],
  },
];

export const demoCart: import('./types').CartItem[] = [
  {
    menuItemId: 'item_1',
    restaurantId: 'rest_2',
    name: 'Margherita Pizza',
    priceCents: 1799,
    quantity: 1,
    selectedOptions: [{ customizationId: 'cust_1', optionId: 'size_l', label: '14" Large', priceCents: 400 }],
  },
  {
    menuItemId: 'item_3',
    restaurantId: 'rest_2',
    name: 'Bruschetta al Pomodoro',
    priceCents: 899,
    quantity: 2,
  },
];

export const demoFoodOrders: import('./types').FoodOrder[] = [
  {
    id: 'order_demo_1',
    restaurantId: 'rest_2',
    restaurantName: 'Bella Italia',
    riderId: 'demo-rider',
    driverId: 'driver-55',
    status: 'on_the_way',
    items: demoCart,
    subtotalCents: 3597,
    deliveryFeeCents: 299,
    taxCents: 302,
    discountCents: 0,
    totalCents: 4198,
    deliveryAddressId: 'home',
    deliveryAddress: '15 Market Street, San Francisco, CA',
    deliveryInstructions: 'Ring bell at unit 9B',
    estimatedDeliveryMins: 12,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'order_demo_2',
    restaurantId: 'rest_1',
    restaurantName: 'Golden Dragon',
    riderId: 'demo-rider',
    status: 'delivered',
    items: [
      { menuItemId: 'item_gd_1', restaurantId: 'rest_1', name: 'Kung Pao Chicken', priceCents: 1499, quantity: 1 },
      { menuItemId: 'item_gd_2', restaurantId: 'rest_1', name: 'Fried Rice', priceCents: 999, quantity: 2 },
    ],
    subtotalCents: 3497,
    deliveryFeeCents: 199,
    taxCents: 288,
    discountCents: 500,
    totalCents: 3484,
    deliveryAddressId: 'work',
    deliveryAddress: '410 Mission Street, San Francisco, CA',
    estimatedDeliveryMins: 0,
    rating: 5,
    review: 'Kung pao was perfectly spicy!',
    createdAt: now,
    updatedAt: now,
  },
];
