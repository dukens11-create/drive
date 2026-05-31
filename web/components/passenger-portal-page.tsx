'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Button, Card, Input, Metric, Pill, SectionTitle, Select, Textarea } from './ui';
import { useAppState, useTranslation } from './providers';
import { apiReady, apiBaseUrl } from '../lib/config';
import { autocompleteAddresses } from '../lib/places';
import { authApi, foodApi, marketplaceApi, ridesApi, supportApi, walletApi } from '../lib/api';
import { addressSuggestions, demoCart, demoFoodOrders, demoMenuCategories, demoReceipt, demoRestaurants, demoRides, emergencyContacts, faqItems, notifications as demoNotifications, paymentMethods, promos as demoPromos, referralSummary, savedAddresses, savedTrips, scheduledRides, supportTickets as demoTickets, walletEntries as demoWalletEntries, rideTypes } from '../lib/demo-data';
import { downloadReceiptPdf, downloadWalletCsv } from '../lib/download';
import type { AddressSuggestion, CartItem, FoodOrder, MenuCategory, PortalSection, Restaurant, RideEvent, RideReceipt, RideSummary, SupportTicket, WalletEntry } from '../lib/types';

const navItems: Array<{ href: string; label: string; section: PortalSection }> = [
  { href: '/', label: 'Home', section: 'home' },
  { href: '/auth', label: 'Auth', section: 'auth' },
  { href: '/book', label: 'Book', section: 'book' },
  { href: '/ride/live', label: 'Live Ride', section: 'liveRide' },
  { href: '/history', label: 'History', section: 'history' },
  { href: '/scheduled', label: 'Scheduled', section: 'scheduled' },
  { href: '/food', label: 'Food', section: 'food' },
  { href: '/food/cart', label: 'Cart', section: 'foodCart' },
  { href: '/food/order/live', label: 'Order Live', section: 'foodOrderLive' },
  { href: '/food/orders', label: 'Food Orders', section: 'foodOrders' },
  { href: '/wallet', label: 'Wallet', section: 'wallet' },
  { href: '/promotions', label: 'Promotions', section: 'promotions' },
  { href: '/support', label: 'Support', section: 'support' },
  { href: '/account', label: 'Account', section: 'account' },
];

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function PassengerPortalPage({ section, rideId }: { section: PortalSection; rideId?: string }) {
  const pathname = usePathname();
  const t = useTranslation();
  const { session, preferences, banner, setBanner, setTheme, setLocale, setHighContrast, setTextScale, updatePreference, signIn, signUp, signOut } = useAppState();
  const [rides, setRides] = useState<RideSummary[]>(demoRides);
  const [selectedRide, setSelectedRide] = useState<RideSummary>(demoRides[0]);
  const [receipt, setReceipt] = useState<RideReceipt | null>(demoReceipt);
  const [rideEvents, setRideEvents] = useState<RideEvent[]>(demoRides[0].events || []);
  const [walletEntries, setWalletEntries] = useState<WalletEntry[]>(demoWalletEntries);
  const [walletBalance, setWalletBalance] = useState(3860);
  const [tickets, setTickets] = useState<SupportTicket[]>(demoTickets);
  const [promoItems, setPromoItems] = useState<Array<{ id: string; code: string; discountType: string; discountValue: number; usageCount: number; expiresAt?: string }>>(demoPromos);
  const [referralCode, setReferralCode] = useState(referralSummary.code);
  const [referralBonus, setReferralBonus] = useState(referralSummary.totalBonusCents);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.2);
  const [fareEstimate, setFareEstimate] = useState<number | null>(demoRides[0].fareEstimate);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>(addressSuggestions);
  const [pickup, setPickup] = useState(savedAddresses[0].address);
  const [dropoff, setDropoff] = useState(savedAddresses[1].address);
  const [promoCode, setPromoCode] = useState('DRIVE10');
  const [rideMessage, setRideMessage] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [contactForm, setContactForm] = useState({ email: session?.user.email || 'rider@example.com', phone: session?.user.phone || '+1 (415) 555-0110', fullName: 'Drive Passenger' });
  const [authForm, setAuthForm] = useState({ email: session?.user.email || 'rider@example.com', phone: '', password: 'password123' });

  // Food delivery state
  const [restaurants, setRestaurants] = useState<Restaurant[]>(demoRestaurants);
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant>(demoRestaurants[0]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(demoMenuCategories);
  const [cart, setCart] = useState<CartItem[]>(demoCart);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>(demoFoodOrders);
  const [activeOrder, setActiveOrder] = useState<FoodOrder>(demoFoodOrders[0]);
  const [foodOrderRating, setFoodOrderRating] = useState(5);
  const [foodOrderReview, setFoodOrderReview] = useState('');
  const [foodPromoCode, setFoodPromoCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('Ring bell at unit 9B');

  useEffect(() => {
    if (!session || !apiReady) {
      return;
    }

    const userId = session.user.id;
    void Promise.allSettled([
      ridesApi.history().then((response) => {
        setRides(response.rides);
        setSelectedRide(response.rides[0] || demoRides[0]);
      }),
      ridesApi.notifications().then((response) => setRideEvents(response.notifications)),
      walletApi.balance(userId).then((response) => setWalletBalance(response.balanceCents)),
      walletApi.ledger(userId).then((response) => setWalletEntries(response.entries)),
      supportApi.listTickets(userId).then((response) => setTickets(response.tickets)),
      marketplaceApi.promos().then((response) => setPromoItems(response.promos)),
      marketplaceApi.referralCode().then((response) => setReferralCode(response.referralCode)),
      marketplaceApi.referrals().then((response) => setReferralBonus(response.totalBonusCents)),
      marketplaceApi.surge().then((response) => setSurgeMultiplier(response.multiplier)),
      foodApi.listRestaurants().then((response) => setRestaurants(response.restaurants)),
      foodApi.listOrders().then((response) => {
        setFoodOrders(response.orders);
        if (response.orders[0]) setActiveOrder(response.orders[0]);
      }),
    ]).catch(() => undefined);
  }, [session]);

  useEffect(() => {
    if (!session || !selectedRide?.id || !apiReady) {
      return;
    }

    void ridesApi.detail(selectedRide.id).then((response) => {
      setSelectedRide(response.ride);
      setReceipt(response.receipt);
      setRideEvents(response.notifications);
    }).catch(() => undefined);
  }, [selectedRide.id, session]);

  useEffect(() => {
    if (!session || !selectedRide?.id || !apiReady) {
      return;
    }

    const socket = io(apiBaseUrl, {
      transports: ['websocket'],
      auth: { token: session.accessToken },
    });

    socket.emit('ride:join', { rideId: selectedRide.id });
    socket.on('ride:driver_location', (payload) => {
      setBanner(`Live driver update at ${payload.updatedAt}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedRide.id, session, setBanner]);

  useEffect(() => {
    const match = rides.find((entry) => entry.id === rideId);
    if (match) {
      setSelectedRide(match);
    }
  }, [rideId, rides]);

  const filteredRides = useMemo(() => rides.filter((ride) => `${ride.id} ${ride.status} ${ride.review || ''}`.toLowerCase().includes(search.toLowerCase())), [rides, search]);

  const liveModeLabel = apiReady ? t('connected') : t('demo');

  const estimateRide = async () => {
    try {
      if (!session || !apiReady) {
        setFareEstimate(19.25);
        setBanner('Using demo fare estimate. Connect NEXT_PUBLIC_API_BASE_URL for live quotes.');
        return;
      }
      const response = await ridesApi.estimate({ pickupLat: 37.7749, pickupLng: -122.4194, dropoffLat: 37.781, dropoffLng: -122.405, miles: 5, minutes: 18 });
      setFareEstimate(response.fareEstimate);
      setBanner(`Fare refreshed with ${response.surgeMultiplier.toFixed(2)}x surge.`);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Unable to estimate fare.');
    }
  };

  const requestRide = async () => {
    try {
      if (!session || !apiReady) {
        setBanner('Ride request saved as a demo confirmation. Sign in to connect to the backend.');
        return;
      }
      const response = await ridesApi.request({ pickupLat: 37.7749, pickupLng: -122.4194, dropoffLat: 37.781, dropoffLng: -122.405, miles: 5, minutes: 18, promoCode });
      setSelectedRide(response.ride);
      setRides((current) => [response.ride, ...current.filter((ride) => ride.id !== response.ride.id)]);
      setBanner(`Ride ${response.ride.id} booked successfully.`);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Unable to request ride.');
    }
  };

  const handleAddressSearch = async (value: string, setter: (value: string) => void) => {
    setter(value);
    setSuggestions(await autocompleteAddresses(value));
  };

  const sendTripMessage = async () => {
    if (!rideMessage.trim()) {
      return;
    }
    try {
      if (!session || !apiReady) {
        setRideEvents((current) => [{ id: `demo-${Date.now()}`, type: 'chat_message', title: 'Trip chat', message: rideMessage, createdAt: new Date().toISOString() }, ...current]);
      } else {
        const response = await ridesApi.message(selectedRide.id, rideMessage);
        setRideEvents((current) => [response.message, ...current]);
      }
      setRideMessage('');
      setBanner('Trip message sent.');
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Unable to message driver.');
    }
  };

  const submitTicket = async () => {
    if (!ticketMessage.trim()) {
      return;
    }
    try {
      if (!session || !apiReady) {
        const ticket: SupportTicket = { id: `ticket-${Date.now()}`, type: 'general', message: ticketMessage, status: 'open', replies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setTickets((current) => [ticket, ...current]);
      } else {
        const response = await supportApi.createTicket(session.user.id, 'general', ticketMessage);
        setTickets((current) => [response.ticket, ...current]);
      }
      setTicketMessage('');
      setBanner('Support request submitted.');
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Unable to create support ticket.');
    }
  };

  const submitRating = async () => {
    try {
      if (session && apiReady && selectedRide.status === 'completed') {
        await ridesApi.rate(selectedRide.id, rating, review);
      }
      setBanner(`Submitted ${rating}-star feedback.`);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Unable to submit rating.');
    }
  };

  const handleSignIn = async () => {
    await signIn(authForm.phone ? { phone: authForm.phone, password: authForm.password } : { email: authForm.email, password: authForm.password });
  };

  const handleSignUp = async () => {
    await signUp(authForm.phone ? { phone: authForm.phone, password: authForm.password } : { email: authForm.email, password: authForm.password });
  };

  // Food delivery helpers
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.priceCents + (item.selectedOptions?.reduce((s, o) => s + o.priceCents, 0) ?? 0)) * item.quantity, 0);
  const cartDeliveryFee = cart.length > 0 ? selectedRestaurant.deliveryFeeCents : 0;
  const cartTax = Math.round(cartSubtotal * 0.085);
  const cartTotal = cartSubtotal + cartDeliveryFee + cartTax;

  const addToCart = (item: MenuCategory['items'][number]) => {
    setCart((current) => {
      const existing = current.find((c) => c.menuItemId === item.id);
      if (existing) {
        return current.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...current, { menuItemId: item.id, restaurantId: item.restaurantId, name: item.name, priceCents: item.priceCents, quantity: 1 }];
    });
    setBanner(`Added ${item.name} to cart.`);
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((current) => current.filter((c) => c.menuItemId !== menuItemId));
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((current) =>
      current.flatMap((c) => {
        if (c.menuItemId !== menuItemId) return [c];
        const next = c.quantity + delta;
        return next > 0 ? [{ ...c, quantity: next }] : [];
      })
    );
  };

  const placeFoodOrder = async () => {
    if (cart.length === 0) {
      setBanner('Your cart is empty.');
      return;
    }
    try {
      if (!session || !apiReady) {
        const newOrder: FoodOrder = {
          id: `order-${Date.now()}`,
          restaurantId: selectedRestaurant.id,
          restaurantName: selectedRestaurant.name,
          riderId: 'demo-rider',
          status: 'placed',
          items: cart,
          subtotalCents: cartSubtotal,
          deliveryFeeCents: cartDeliveryFee,
          taxCents: cartTax,
          discountCents: 0,
          totalCents: cartTotal,
          deliveryAddressId: savedAddresses[0].id,
          deliveryAddress: savedAddresses[0].address,
          deliveryInstructions,
          estimatedDeliveryMins: selectedRestaurant.deliveryTimeMins,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setFoodOrders((current) => [newOrder, ...current]);
        setActiveOrder(newOrder);
        setCart([]);
        setBanner(`Order ${newOrder.id} placed! Estimated delivery: ${selectedRestaurant.deliveryTimeMins} min.`);
      } else {
        const response = await foodApi.placeOrder({
          restaurantId: selectedRestaurant.id,
          items: cart,
          deliveryAddressId: savedAddresses[0].id,
          deliveryInstructions,
          promoCode: foodPromoCode || undefined,
        });
        setFoodOrders((current) => [response.order, ...current]);
        setActiveOrder(response.order);
        setCart([]);
        setBanner(`Order ${response.order.id} placed!`);
      }
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Unable to place order.');
    }
  };

  const submitFoodRating = async () => {
    try {
      if (session && apiReady) {
        await foodApi.rateOrder(activeOrder.id, foodOrderRating, foodOrderReview || undefined);
      }
      setBanner(`Submitted ${foodOrderRating}-star rating for your food order.`);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Unable to rate order.');
    }
  };

  const filteredRestaurants = useMemo(
    () => restaurants.filter((r) => {
      const matchSearch = `${r.name} ${r.cuisine.join(' ')}`.toLowerCase().includes(restaurantSearch.toLowerCase());
      const matchCuisine = !cuisineFilter || r.cuisine.some((c) => c.toLowerCase().includes(cuisineFilter.toLowerCase()));
      return matchSearch && matchCuisine;
    }),
    [restaurants, restaurantSearch, cuisineFilter],
  );

  const foodOrderStatusLabel: Record<FoodOrder['status'], string> = {
    placed: 'Order placed',
    restaurant_confirmed: 'Restaurant confirmed',
    preparing: 'Preparing',
    ready_for_pickup: 'Ready for pickup',
    driver_picked_up: 'Driver picked up',
    on_the_way: 'On the way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  const pageContent = {
    home: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Launch-ready" title={t('welcome')} description="Responsive booking, account management, wallet, support, real-time ride tracking, notifications, accessibility controls, and internationalized preferences are all available from the web shell." action={<Pill>{liveModeLabel}</Pill>} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Drive Passenger Web', applicationCategory: 'TravelApplication' }) }} />
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Active ride" value={selectedRide.status.toUpperCase()} hint="Live driver ETA, trip sharing, and in-ride support." />
          <Metric label="Wallet balance" value={currency(walletBalance / 100)} hint="Top up funds and export ledgers as CSV/PDF." />
          <Metric label="Referral earnings" value={currency(referralBonus / 100)} hint="Share your invite link and track bonus payouts." />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr,0.9fr]">
          <Card className="space-y-4">
            <SectionTitle eyebrow="Quick book" title="Ride request launcher" description="Fast pickup and drop-off form with promo support, saved addresses, and schedule-ready routing." action={<Link href="/book" className="text-sm font-semibold text-sky-300">Open booking →</Link>} />
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={pickup} onChange={(event) => void handleAddressSearch(event.target.value, setPickup)} placeholder="Pickup location" />
              <Input value={dropoff} onChange={(event) => void handleAddressSearch(event.target.value, setDropoff)} placeholder="Drop-off location" />
            </div>
            <div className="flex flex-wrap gap-2">{suggestions.map((item) => <Pill key={item.id}>{item.title}</Pill>)}</div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={estimateRide}>Estimate fare</Button>
              <Button tone="secondary" onClick={requestRide}>Confirm ride</Button>
              <Button tone="ghost" onClick={() => setBanner('Trip share link copied for emergency contacts.')}>Share trip</Button>
            </div>
          </Card>
          <Card className="space-y-4">
            <SectionTitle eyebrow="Notifications" title="In-app updates" description="Driver matched, nearby alerts, promo reminders, and payment updates are collected here and remain screen-reader friendly." />
            {demoNotifications.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-white">{item.title}</p>
                  <span className="text-xs text-slate-400">{item.timestamp}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{item.body}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    ),
    auth: (
      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="space-y-4">
          <SectionTitle eyebrow="Authentication" title="Login, signup, verification, and recovery" description="Email or phone sign-in uses JWT-backed backend endpoints, while verification and password recovery cards are wired for account-management flows." />
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
            <Input value={authForm.phone} onChange={(event) => setAuthForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" />
          </div>
          <Input type="password" value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleSignIn()}>Login</Button>
            <Button tone="secondary" onClick={() => void handleSignUp()}>Create account</Button>
            <Button tone="ghost" onClick={() => setBanner('Verification email queued. Connect a mailer to automate delivery.')}>Verify email</Button>
            <Button tone="ghost" onClick={() => setBanner('Password reset link generated. Connect a delivery provider to send it.')}>Reset password</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Button tone="secondary">Continue with Google</Button>
            <Button tone="secondary">Continue with Apple</Button>
            <Button tone="secondary">Continue with Facebook</Button>
          </div>
        </Card>
        <Card className="space-y-4">
          <SectionTitle eyebrow="Session" title={session ? 'Connected rider session' : 'No active session'} description="JWT refresh is automatic when NEXT_PUBLIC_API_BASE_URL is configured; otherwise the UI stays in interactive demo mode." />
          <p className="text-sm text-slate-300">{session ? `Signed in as ${session.user.email || session.user.phone || session.user.id}` : 'Use the sample credentials to explore the portal locally.'}</p>
          <Button tone="secondary" onClick={() => void signOut()}>Sign out</Button>
        </Card>
      </div>
    ),
    book: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Booking" title="Pickup, drop-off, ride type, promo, and confirmation" description="Interactive booking flow includes autocomplete, fare estimation, ride-type selection, promo application, trip sharing, and confirmation before submission." />
        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <Card className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={pickup} onChange={(event) => void handleAddressSearch(event.target.value, setPickup)} placeholder="Pickup" />
              <Input value={dropoff} onChange={(event) => void handleAddressSearch(event.target.value, setDropoff)} placeholder="Drop-off" />
            </div>
            <div className="rounded-3xl border border-dashed border-sky-400/40 bg-sky-400/10 p-6 text-sm text-slate-200">
              Interactive map canvas placeholder with route overlays, live ETA, and pickup markers. If Google Maps is configured, address search upgrades to live Places predictions.
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {rideTypes.map((type) => (
                <Card key={type.id} className="space-y-2 bg-slate-950/50 p-4">
                  <p className="font-semibold text-white">{type.name}</p>
                  <p className="text-sm text-slate-300">{type.description}</p>
                  <p className="text-xs text-slate-400">ETA {type.eta} · {type.seats} seats · {type.multiplier.toFixed(2)}x</p>
                </Card>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr,auto,auto]">
              <Input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="Promo code" />
              <Button tone="secondary" onClick={() => setBanner(`Applied ${promoCode.toUpperCase()} to this trip.`)}>Apply code</Button>
              <Button onClick={estimateRide}>Refresh estimate</Button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
              <p>Estimated fare: <strong>{fareEstimate ? currency(fareEstimate) : 'Request estimate'}</strong></p>
              <p>Surge multiplier: <strong>{surgeMultiplier.toFixed(2)}x</strong></p>
              <p>Payment method: <strong>{paymentMethods[0].label}</strong></p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={requestRide}>Book ride</Button>
              <Button tone="secondary" onClick={() => setBanner('Ride scheduled for tomorrow at 6:15 AM.')}>Schedule ride</Button>
              <Button tone="ghost" onClick={() => setBanner('Accessibility preferences will be applied to the next booking step.')}>Accessibility options</Button>
            </div>
          </Card>
          <Card className="space-y-4">
            <SectionTitle eyebrow="Confirmation" title="Review before booking" description="The right rail summarizes fares, savings, saved trips, emergency contacts, and quick destinations for repeat bookings." />
            {savedAddresses.map((address) => <Pill key={address.id}>{address.label}: {address.address}</Pill>)}
            <div className="space-y-3">
              {savedTrips.map((trip) => (
                <div key={trip.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="font-semibold text-white">{trip.label}</p>
                  <p className="text-sm text-slate-300">{trip.from} → {trip.to}</p>
                  <p className="text-xs text-slate-400">{trip.frequency}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    ),
    liveRide: (
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="space-y-4">
          <SectionTitle eyebrow="Active trip" title="Driver tracking, support, and trip progress" description="Ride-room WebSocket joins the selected trip for live location updates while keeping support, ETA, and emergency actions in one place." />
          <div className="rounded-3xl border border-dashed border-emerald-400/40 bg-emerald-400/10 p-8 text-sm text-slate-100">Map canvas: driver at 37.7780, -122.4110 · ETA 6 min · route optimized for current traffic.</div>
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Driver" value="Alex P." hint="4.9 ★ · Silver Toyota Prius" />
            <Metric label="ETA" value="6 min" hint="Updated from live traffic" />
            <Metric label="Trip stage" value="In transit" hint="Pickup confirmed → In transit → Arriving" />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr,auto]">
            <Input value={rideMessage} onChange={(event) => setRideMessage(event.target.value)} placeholder="Message your driver" />
            <Button onClick={sendTripMessage}>Send</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button tone="secondary" onClick={() => setBanner('Calling driver using the preferred contact route.')}>Call driver</Button>
            <Button tone="secondary" onClick={() => setBanner('Safety team notified and trip shared with emergency contacts.')}>Emergency help</Button>
            <Button tone="ghost" onClick={() => setBanner('Trip link copied to clipboard.')}>Share trip</Button>
          </div>
        </Card>
        <Card className="space-y-4">
          <SectionTitle eyebrow="Trip completion" title="Receipt, tip, and rating" description="Post-ride actions stay available immediately after arrival, including invoice PDF export and ledger sync." />
          <Select value={String(rating)} onChange={(event) => setRating(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
          </Select>
          <Textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Leave a comment for your driver" />
          <div className="flex flex-wrap gap-3">
            <Button onClick={submitRating}>Submit feedback</Button>
            <Button tone="secondary" onClick={() => downloadReceiptPdf(selectedRide, receipt)}>Download PDF invoice</Button>
            <Button tone="ghost" onClick={() => setBanner('Tip added to your receipt preview.')}>Add tip</Button>
          </div>
          {rideEvents.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="font-semibold text-white">{event.title}</p>
              <p className="mt-1 text-sm text-slate-300">{event.message}</p>
            </div>
          ))}
        </Card>
      </div>
    ),
    history: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Trip management" title="History, search, filters, and ride detail" description="Search past trips, inspect route and fare details, download invoices, and jump back into a favorite destination or saved trip." />
        <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
          <Card className="space-y-4">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by ride ID, status, or review" />
            {filteredRides.map((ride) => (
              <button key={ride.id} type="button" onClick={() => setSelectedRide(ride)} className="w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-white">{ride.id}</p>
                  <Pill>{ride.status}</Pill>
                </div>
                <p className="mt-2 text-sm text-slate-300">{ride.miles} mi · {ride.minutes} min · {currency(ride.fareEstimate)}</p>
                <p className="text-xs text-slate-400">{formatDate(ride.updatedAt)}</p>
              </button>
            ))}
          </Card>
          <Card className="space-y-4">
            <SectionTitle eyebrow="Ride detail" title={selectedRide.id} description="Route map, fare breakdown, driver details, and quick rebooking actions for favorites and scheduled repeats." action={<Link href={`/history/${selectedRide.id}`} className="text-sm font-semibold text-sky-300">Open detail page →</Link>} />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Receipt summary</p>
                <p className="mt-2">Invoice {receipt?.invoiceNumber || 'pending'}</p>
                <p>Total {receipt ? currency(receipt.totalCents / 100) : currency(selectedRide.fareEstimate)}</p>
                <p>Payment status {receipt?.paymentStatus || 'pending'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Driver details</p>
                <p className="mt-2">Alex P. · Toyota Prius</p>
                <p>Rating 4.9 ★</p>
                <p>Accessibility support enabled</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => downloadReceiptPdf(selectedRide, receipt)}>Receipt PDF</Button>
              <Button tone="secondary" onClick={() => setBanner('Rebooking your selected route into the booking flow.')}>Book again</Button>
              <Button tone="ghost" onClick={() => setBanner('Saved this route to favorite destinations.')}>Save destination</Button>
            </div>
          </Card>
        </div>
      </div>
    ),
    rideDetail: (
      <Card className="space-y-4">
        <SectionTitle eyebrow="Deep dive" title={`Ride detail · ${selectedRide.id}`} description="Dedicated ride detail page with searchable event timeline, receipt access, and quick export actions." />
        <p className="text-sm text-slate-300">Status: {selectedRide.status} · Fare: {currency(selectedRide.fareEstimate)}</p>
        {rideEvents.map((event) => <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="font-semibold text-white">{event.title}</p><p className="text-sm text-slate-300">{event.message}</p></div>)}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => downloadReceiptPdf(selectedRide, receipt)}>Download invoice PDF</Button>
          <Link href="/history" className="inline-flex min-h-11 items-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white">Back to history</Link>
        </div>
      </Card>
    ),
    wallet: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Wallet & payments" title="Balance, payment methods, transactions, receipts" description="Manage cards and digital wallets, add funds, inspect your ledger, and export receipts or transaction history for accounting." />
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Balance" value={currency(walletBalance / 100)} hint="Available across rides, tips, and promo credits." />
          <Metric label="Default payment" value={paymentMethods[0].label} hint="Card, wallet, and backup methods supported." />
          <Metric label="Invoices ready" value={String(filteredRides.length)} hint="Download per-ride PDF receipts on demand." />
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
          <Card className="space-y-4">
            <SectionTitle eyebrow="Funding" title="Top up wallet" description="Keep funds ready for low-connectivity trips and business travel reimbursements." />
            <div className="flex flex-wrap gap-3">
              {[10, 25, 50].map((amount) => <Button key={amount} tone="secondary" onClick={() => setBanner(`Added ${currency(amount)} in demo mode.`)}>{currency(amount)}</Button>)}
            </div>
            <Button onClick={() => setBanner('Opening secure card capture for a new payment method.')}>Add payment method</Button>
            <div className="space-y-3">{paymentMethods.map((method) => <div key={method.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="font-semibold text-white">{method.label}</p><p className="text-sm text-slate-300">{method.detail}</p></div>)}</div>
          </Card>
          <Card className="space-y-4">
            <SectionTitle eyebrow="Ledger" title="Transaction history" description="CSV export is available today, and PDF invoices remain one tap away from ride history or live-ride completion." action={<Button tone="secondary" onClick={() => downloadWalletCsv(walletEntries)}>Export CSV</Button>} />
            {walletEntries.map((entry) => <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-center justify-between"><p className="font-semibold text-white">{entry.reason}</p><Pill>{entry.kind}</Pill></div><p className="mt-2 text-sm text-slate-300">{currency(entry.amountCents / 100)} · {formatDate(entry.createdAt)}</p></div>)}
          </Card>
        </div>
      </div>
    ),
    promotions: (
      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <Card className="space-y-4">
          <SectionTitle eyebrow="Discounts" title="Promo codes and active offers" description="Apply promo codes before checkout, browse active campaigns, and keep surge transparency visible during booking." />
          <div className="grid gap-3 md:grid-cols-[1fr,auto]">
            <Input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="Enter promo or referral code" />
            <Button onClick={() => setBanner(`Applied ${promoCode.toUpperCase()} to your account.`)}>Apply</Button>
          </div>
          {promoItems.map((promo) => <div key={promo.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-center justify-between gap-4"><p className="font-semibold text-white">{promo.code}</p><Pill>{promo.discountType}</Pill></div><p className="mt-2 text-sm text-slate-300">{promo.discountType === 'percent' ? `${promo.discountValue}% off` : currency(promo.discountValue / 100)} · Uses {promo.usageCount}</p></div>)}
        </Card>
        <Card className="space-y-4">
          <SectionTitle eyebrow="Referral" title="Share links and track earnings" description="Referral code issuance and invite history connect directly to the backend when authenticated." />
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Referral code</p>
            <p className="mt-2 text-xl font-semibold text-sky-300">{referralCode}</p>
            <p className="mt-2">Total earned: {currency(referralBonus / 100)}</p>
          </div>
          {referralSummary.invites.map((invite) => <div key={invite.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="font-semibold text-white">Invite {invite.referredUserId}</p><p className="text-sm text-slate-300">Bonus {currency(invite.bonusCents / 100)} · {invite.paid ? 'Paid' : 'Pending'}</p></div>)}
        </Card>
      </div>
    ),
    support: (
      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-4">
          <SectionTitle eyebrow="Help" title="FAQs, support tickets, contact forms, lost & found" description="The support hub keeps knowledge-base content, live issue submission, ticket tracking, and lost-item recovery in one accessible flow." />
          {faqItems.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="font-semibold text-white">{item.question}</p><p className="mt-2 text-sm text-slate-300">{item.answer}</p></div>)}
          <Textarea value={ticketMessage} onChange={(event) => setTicketMessage(event.target.value)} placeholder="Describe your issue, lost item, or refund request" />
          <Button onClick={submitTicket}>Submit issue</Button>
        </Card>
        <Card className="space-y-4">
          <SectionTitle eyebrow="Tracking" title="Open tickets and escalation status" description="View your submitted tickets, follow agent replies, and keep a digital record of lost-and-found or safety incidents." />
          {tickets.map((ticket) => <div key={ticket.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-center justify-between gap-4"><p className="font-semibold text-white">{ticket.type}</p><Pill>{ticket.status}</Pill></div><p className="mt-2 text-sm text-slate-300">{ticket.message}</p><p className="mt-2 text-xs text-slate-400">Updated {formatDate(ticket.updatedAt)}</p></div>)}
        </Card>
      </div>
    ),
    account: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Account" title="Profile, privacy, addresses, payment methods, accessibility" description="Manage rider identity, saved places, emergency contacts, communication preferences, and accessibility settings from a single responsive settings page." />
        <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
          <Card className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={contactForm.fullName} onChange={(event) => setContactForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" />
              <Input value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
            </div>
            <Input value={contactForm.phone} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setBanner('Profile changes saved locally for demo mode.')}>Save profile</Button>
              <Button tone="secondary" onClick={() => setBanner('Profile photo upload flow opened.')}>Update photo</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={preferences.locale} onChange={(event) => setLocale(event.target.value as typeof preferences.locale)}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </Select>
              <Select value={preferences.textScale} onChange={(event) => setTextScale(event.target.value as typeof preferences.textScale)}>
                <option value="sm">Compact text</option>
                <option value="md">Default text</option>
                <option value="lg">Large text</option>
              </Select>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button tone="secondary" onClick={() => setTheme(preferences.theme === 'dark' ? 'light' : 'dark')}>Toggle theme</Button>
              <Button tone="secondary" onClick={() => setHighContrast(!preferences.highContrast)}>High contrast {preferences.highContrast ? 'on' : 'off'}</Button>
            </div>
          </Card>
          <Card className="space-y-4">
            <SectionTitle eyebrow="Preferences" title="Notifications and saved places" description="Privacy, notifications, saved addresses, quick destinations, emergency contacts, and accessibility preferences stay together for easy account management." />
            <div className="space-y-2 text-sm text-slate-300">
              <label className="flex items-center justify-between gap-3"><span>Email notifications</span><input type="checkbox" checked={preferences.emailNotifications} onChange={(event) => updatePreference('emailNotifications', event.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Push notifications</span><input type="checkbox" checked={preferences.pushNotifications} onChange={(event) => updatePreference('pushNotifications', event.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Marketing emails</span><input type="checkbox" checked={preferences.marketingEmails} onChange={(event) => updatePreference('marketingEmails', event.target.checked)} /></label>
            </div>
            <div className="space-y-3">{savedAddresses.map((address) => <div key={address.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="font-semibold text-white">{address.label}</p><p className="text-sm text-slate-300">{address.address}</p></div>)}</div>
            <div className="space-y-3">{emergencyContacts.map((contact) => <div key={contact.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="font-semibold text-white">{contact.name}</p><p className="text-sm text-slate-300">{contact.relation} · {contact.phone}</p></div>)}</div>
          </Card>
        </div>
      </div>
    ),
    scheduled: (
      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <Card className="space-y-4">
          <SectionTitle eyebrow="Schedule" title="Book rides in advance" description="Plan airport trips, recurring commutes, and event transport with confirmation windows, reminders, and quick favorite destination access." />
          {scheduledRides.map((ride) => <div key={ride.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-center justify-between gap-4"><p className="font-semibold text-white">{ride.route}</p><Pill>{ride.status}</Pill></div><p className="mt-2 text-sm text-slate-300">{ride.pickupWindow}</p></div>)}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setBanner('Scheduled ride updated.')}>Manage rides</Button>
            <Button tone="secondary" onClick={() => setBanner('Reminder notifications enabled for scheduled trips.')}>Send reminder</Button>
          </div>
        </Card>
        <Card className="space-y-4">
          <SectionTitle eyebrow="Favorites" title="Favorite destinations and saved trips" description="Quick-book common routes and keep frequently used pickups and drop-offs one tap away." />
          {savedTrips.map((trip) => <div key={trip.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><p className="font-semibold text-white">{trip.label}</p><p className="text-sm text-slate-300">{trip.from} → {trip.to}</p></div>)}
          <Button onClick={() => setBanner('Favorite destination pinned to your home screen.')}>Pin favorite</Button>
        </Card>
      </div>
    ),
    food: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Food delivery" title="Restaurants, menus, and ordering" description="Browse nearby restaurants, filter by cuisine and delivery time, view menus, and add items to your cart in one seamless flow." />
        <div className="grid gap-3 md:grid-cols-[1fr,auto,auto]">
          <Input value={restaurantSearch} onChange={(event) => setRestaurantSearch(event.target.value)} placeholder="Search restaurants or cuisines" />
          <Input value={cuisineFilter} onChange={(event) => setCuisineFilter(event.target.value)} placeholder="Cuisine filter" />
          <Button tone="ghost" onClick={() => { setRestaurantSearch(''); setCuisineFilter(''); }}>Clear</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRestaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              onClick={() => {
                setSelectedRestaurant(restaurant);
                if (session && apiReady) {
                  void foodApi.getRestaurant(restaurant.id).then((r) => setMenuCategories(r.menu)).catch(() => undefined);
                }
                setBanner(`Viewing menu for ${restaurant.name}.`);
              }}
              className="w-full rounded-3xl border border-white/10 bg-white/6 p-5 text-left shadow-lg shadow-slate-950/20 backdrop-blur transition hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{restaurant.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{restaurant.cuisine.join(' · ')}</p>
                </div>
                <Pill>{restaurant.open ? 'Open' : 'Closed'}</Pill>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
                <span>⭐ {restaurant.rating} ({restaurant.reviewCount})</span>
                <span>🕐 {restaurant.deliveryTimeMins} min</span>
                <span>📍 {restaurant.distanceMiles} mi</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Delivery {currency(restaurant.deliveryFeeCents / 100)} · Min {currency(restaurant.minimumOrderCents / 100)}</p>
            </button>
          ))}
        </div>
        <Card className="space-y-4">
          <SectionTitle eyebrow={selectedRestaurant.cuisine.join(' · ')} title={selectedRestaurant.name} description={selectedRestaurant.description || 'Browse menu and add items to your cart.'} />
          {menuCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              <p className="font-semibold text-sky-300">{category.name}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {category.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{item.name}{item.popular ? ' 🔥' : ''}</p>
                        <p className="mt-1 text-sm text-slate-300 line-clamp-2">{item.description}</p>
                        {item.allergens?.length ? <p className="mt-1 text-xs text-slate-400">Allergens: {item.allergens.join(', ')}</p> : null}
                        {item.calories ? <p className="mt-1 text-xs text-slate-400">{item.calories} kcal</p> : null}
                      </div>
                      <p className="shrink-0 font-semibold text-white">{currency(item.priceCents / 100)}</p>
                    </div>
                    <Button
                      tone="secondary"
                      className="mt-3 w-full"
                      disabled={!item.available}
                      onClick={() => addToCart(item)}
                    >
                      {item.available ? 'Add to cart' : 'Unavailable'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>
    ),
    foodCart: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Cart" title="Review order and checkout" description="Adjust quantities, enter delivery address and instructions, apply a promo code, and place your food order." />
        {cart.length === 0 ? (
          <Card className="py-10 text-center text-slate-300">Your cart is empty. Browse restaurants to add items.</Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <Card className="space-y-4">
              <SectionTitle eyebrow={selectedRestaurant.name} title="Cart items" description="Review each item, update quantities, or remove items before checkout." />
              {cart.map((item) => (
                <div key={item.menuItemId} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      {item.selectedOptions?.map((opt) => <p key={opt.optionId} className="text-xs text-slate-400">{opt.label} +{currency(opt.priceCents / 100)}</p>)}
                    </div>
                    <p className="shrink-0 font-semibold text-white">{currency(item.priceCents / 100)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Button tone="ghost" onClick={() => updateCartQty(item.menuItemId, -1)}>−</Button>
                    <span className="font-semibold text-white">{item.quantity}</span>
                    <Button tone="ghost" onClick={() => updateCartQty(item.menuItemId, 1)}>+</Button>
                    <Button tone="ghost" className="ml-auto text-red-400" onClick={() => removeFromCart(item.menuItemId)}>Remove</Button>
                  </div>
                </div>
              ))}
            </Card>
            <Card className="space-y-4">
              <SectionTitle eyebrow="Checkout" title="Order summary" description="Confirm delivery details and place your order." />
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{currency(cartSubtotal / 100)}</span></div>
                <div className="flex justify-between"><span>Delivery fee</span><span>{currency(cartDeliveryFee / 100)}</span></div>
                <div className="flex justify-between"><span>Tax (8.5%)</span><span>{currency(cartTax / 100)}</span></div>
                <div className="flex justify-between font-semibold text-white"><span>Total</span><span>{currency(cartTotal / 100)}</span></div>
              </div>
              <Input value={deliveryInstructions} onChange={(event) => setDeliveryInstructions(event.target.value)} placeholder="Delivery instructions (optional)" />
              <div className="grid gap-3 md:grid-cols-[1fr,auto]">
                <Input value={foodPromoCode} onChange={(event) => setFoodPromoCode(event.target.value)} placeholder="Promo code" />
                <Button tone="secondary" onClick={() => setBanner(`Promo ${foodPromoCode.toUpperCase()} applied.`)}>Apply</Button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                <p className="font-semibold text-white">Deliver to</p>
                <p className="mt-1 text-slate-300">{savedAddresses[0].address}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                <p className="font-semibold text-white">Payment</p>
                <p className="mt-1 text-slate-300">{paymentMethods[0].label}</p>
              </div>
              <Button className="w-full" onClick={() => void placeFoodOrder()}>Place order</Button>
            </Card>
          </div>
        )}
      </div>
    ),
    foodOrderLive: (
      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="space-y-4">
          <SectionTitle eyebrow="Live tracking" title="Your order is on its way" description="Follow your delivery driver on the map, check estimated arrival, and contact the restaurant or driver from one place." />
          <div className="rounded-3xl border border-dashed border-amber-400/40 bg-amber-400/10 p-8 text-sm text-slate-100">
            Map canvas: delivery driver approaching your location · ETA {activeOrder.estimatedDeliveryMins} min
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Restaurant" value={activeOrder.restaurantName} hint="Order acknowledged and being prepared." />
            <Metric label="ETA" value={activeOrder.estimatedDeliveryMins > 0 ? `${activeOrder.estimatedDeliveryMins} min` : 'Delivered'} hint="Live traffic adjusted." />
            <Metric label="Status" value={foodOrderStatusLabel[activeOrder.status]} hint="Updated in real time." />
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300 space-y-1">
            <p className="font-semibold text-white">Order timeline</p>
            {(['placed', 'restaurant_confirmed', 'preparing', 'ready_for_pickup', 'driver_picked_up', 'on_the_way', 'delivered'] as const).map((step) => {
              const steps: FoodOrder['status'][] = ['placed', 'restaurant_confirmed', 'preparing', 'ready_for_pickup', 'driver_picked_up', 'on_the_way', 'delivered'];
              const done = steps.indexOf(activeOrder.status) >= steps.indexOf(step);
              return (
                <p key={step} className={done ? 'text-white' : 'text-slate-500'}>
                  {done ? '✓' : '○'} {foodOrderStatusLabel[step]}
                </p>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button tone="secondary" onClick={() => setBanner('Calling driver via preferred contact method.')}>Call driver</Button>
            <Button tone="secondary" onClick={() => setBanner('Chat opened with restaurant.')}>Chat restaurant</Button>
            <Button tone="ghost" onClick={() => setBanner('Order link copied to clipboard.')}>Share order</Button>
          </div>
        </Card>
        <Card className="space-y-4">
          <SectionTitle eyebrow="Order details" title={activeOrder.id} description="Review what you ordered and leave a rating after delivery." />
          {activeOrder.items.map((item) => (
            <div key={item.menuItemId} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex justify-between">
                <p className="font-semibold text-white">{item.name}</p>
                <p className="text-sm text-slate-300">×{item.quantity}</p>
              </div>
              <p className="text-sm text-slate-300">{currency((item.priceCents * item.quantity) / 100)}</p>
            </div>
          ))}
          {activeOrder.status === 'delivered' ? (
            <>
              <Select value={String(foodOrderRating)} onChange={(event) => setFoodOrderRating(Number(event.target.value))}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
              </Select>
              <Textarea value={foodOrderReview} onChange={(event) => setFoodOrderReview(event.target.value)} placeholder="How was your order?" />
              <Button onClick={() => void submitFoodRating()}>Submit rating</Button>
            </>
          ) : null}
        </Card>
      </div>
    ),
    foodOrders: (
      <div className="space-y-6">
        <SectionTitle eyebrow="Order history" title="Past food orders" description="Review your delivery history, reorder favorites, and download receipts from previous orders." />
        <div className="grid gap-4">
          {foodOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setActiveOrder(order)}
              className="w-full rounded-3xl border border-white/10 bg-white/6 p-5 text-left shadow-lg shadow-slate-950/20 backdrop-blur transition hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{order.restaurantName}</p>
                  <p className="mt-1 text-sm text-slate-300">{order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</p>
                </div>
                <div className="text-right">
                  <Pill>{foodOrderStatusLabel[order.status]}</Pill>
                  <p className="mt-2 font-semibold text-white">{currency(order.totalCents / 100)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span>{formatDate(order.createdAt)}</span>
                {order.rating ? <span>⭐ {order.rating}/5{order.review ? ` · "${order.review}"` : ''}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button tone="secondary" onClick={(event) => { event.stopPropagation(); setCart(order.items.map((i) => ({ ...i }))); setBanner('Order items added to cart.'); }}>Reorder</Button>
              </div>
            </button>
          ))}
        </div>
      </div>
    ),
  } as const;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[250px,1fr]">
        <Card className="sticky top-6 h-fit space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Drive</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Passenger Web</h1>
            <p className="mt-2 text-sm text-slate-300">Ride booking, account management, wallet, support, notifications, and accessibility in one responsive shell.</p>
          </div>
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${pathname === item.href ? 'bg-sky-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Mode</p>
            <p className="mt-2">{liveModeLabel}</p>
            <p className="mt-1">{apiReady ? 'Live backend integration is enabled.' : 'Set NEXT_PUBLIC_API_BASE_URL to connect to the backend.'}</p>
          </div>
        </Card>
        <main className="space-y-6">
          <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-300">{session ? `Signed in as ${session.user.email || session.user.phone || session.user.id}` : 'Guest preview session'}</p>
              <p className="mt-1 text-xs text-slate-400">Dark mode, locale, text scaling, and high-contrast preferences apply instantly.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Pill>{preferences.locale.toUpperCase()}</Pill>
              <Pill>{preferences.theme}</Pill>
              <Button tone="secondary" onClick={() => setTheme(preferences.theme === 'dark' ? 'light' : 'dark')}>Theme</Button>
              <Button tone="secondary" onClick={() => setLocale(preferences.locale === 'en' ? 'es' : preferences.locale === 'es' ? 'fr' : 'en')}>Language</Button>
              <Button tone="ghost" onClick={() => void signOut()}>Sign out</Button>
            </div>
          </Card>
          {banner ? <Card className="border-sky-400/30 bg-sky-400/10 text-sm text-sky-50">{banner}</Card> : null}
          {pageContent[section]}
        </main>
      </div>
    </div>
  );
}
